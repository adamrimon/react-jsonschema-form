import { useCallback, useState } from 'react';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import omit from 'lodash/omit';
import {
  ANY_OF_KEY,
  deepEquals,
  ERRORS_KEY,
  FieldProps,
  FormContextType,
  getDiscriminatorFieldFromSchema,
  getTemplate,
  getUiOptions,
  getWidget,
  isFormDataAvailable,
  mergeSchemas,
  ONE_OF_KEY,
  RJSFSchema,
  shouldRenderOptionalField,
  StrictRJSFSchema,
  TranslatableString,
  UiSchema,
} from '@rjsf/utils';

/** Type used for the state of the `AnyOfField` component */
type AnyOfFieldState<S extends StrictRJSFSchema = RJSFSchema> = {
  /** The currently selected option */
  selectedOption: number;
  /** The option schemas after retrieving all $refs */
  retrievedOptions: S[];
};

/** The `AnyOfField` component is used to render a field in the schema that is an `anyOf`, `allOf` or `oneOf`. It tracks
 * the currently selected option and cleans up any irrelevant data in `formData`.
 *
 * @param props - The `FieldProps` for this template
 */
function AnyOfField<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: FieldProps<T, S, F>,
) {
  const {
    name,
    disabled = false,
    errorSchema = {},
    formData,
    onBlur,
    onFocus,
    readonly,
    required = false,
    registry,
    schema,
    uiSchema,
    onChange,
    options,
    fieldPathId,
  } = props;

  const { schemaUtils, widgets, fields, translateString, globalUiOptions } = registry;
  const { SchemaField: _SchemaField } = fields;

  // ---- State ----
  const [state, setState] = useState<AnyOfFieldState<S>>(() => {
    const retrievedOptions = options.map((opt: S) => schemaUtils.retrieveSchema(opt, formData));
    const discriminator = getDiscriminatorFieldFromSchema<S>(schema);
    return {
      retrievedOptions,
      selectedOption: schemaUtils.getClosestMatchingOption(formData, retrievedOptions, 0, discriminator),
    };
  });
  const { selectedOption, retrievedOptions } = state;

  // ---- Prop-change detection (replaces componentDidUpdate) ----
  const [prevProps, setPrevProps] = useState(props);
  if (prevProps !== props) {
    setPrevProps(props);

    let newState = state;

    if (!deepEquals(prevProps.options, options)) {
      const newRetrievedOptions = options.map((opt: S) => schemaUtils.retrieveSchema(opt, formData));
      newState = { ...newState, retrievedOptions: newRetrievedOptions };
    }

    if (!deepEquals(formData, prevProps.formData) && fieldPathId.$id === prevProps.fieldPathId.$id) {
      const discriminator = getDiscriminatorFieldFromSchema<S>(schema);
      const matchingOption = schemaUtils.getClosestMatchingOption(
        formData,
        newState.retrievedOptions,
        newState.selectedOption,
        discriminator,
      );
      if (matchingOption !== newState.selectedOption) {
        newState = { ...newState, selectedOption: matchingOption };
      }
    }

    if (newState !== state) {
      setState(newState);
    }
  }

  // ---- Helpers ----
  const fieldId = `${fieldPathId.$id}${schema.oneOf ? '__oneof_select' : '__anyof_select'}`;

  const onOptionChange = useCallback(
    (option?: string) => {
      const intOption = option !== undefined ? parseInt(option, 10) : -1;
      if (intOption === selectedOption) {
        return;
      }
      const newOption = intOption >= 0 ? retrievedOptions[intOption] : undefined;
      const oldOption = selectedOption >= 0 ? retrievedOptions[selectedOption] : undefined;

      let newFormData = schemaUtils.sanitizeDataForNewSchema(newOption, oldOption, formData);
      if (newOption) {
        newFormData = schemaUtils.getDefaultFormState(newOption, newFormData, 'excludeObjectChildren') as T;
      }

      setState((prev) => ({ ...prev, selectedOption: intOption }));
      onChange(newFormData, fieldPathId.path, undefined, fieldId);
    },
    [selectedOption, retrievedOptions, schemaUtils, formData, onChange, fieldPathId, fieldId],
  );

  // ---- Render ----
  const MultiSchemaFieldTemplate = getTemplate<'MultiSchemaFieldTemplate', T, S, F>(
    'MultiSchemaFieldTemplate',
    registry,
    globalUiOptions,
  );
  const isOptionalRender = shouldRenderOptionalField<T, S, F>(registry, schema, required, uiSchema);
  const hasFormData = isFormDataAvailable<T>(formData);

  const {
    widget = 'select',
    placeholder,
    autofocus,
    autocomplete,
    title = schema.title,
    ...uiOptions
  } = getUiOptions<T, S, F>(uiSchema, globalUiOptions);
  const Widget = getWidget<T, S, F>({ type: 'number' }, widget, widgets);
  const rawErrors = get(errorSchema, ERRORS_KEY, []);
  const fieldErrorSchema = omit(errorSchema, [ERRORS_KEY]);
  const displayLabel = schemaUtils.getDisplayLabel(schema, uiSchema, globalUiOptions);

  const option = selectedOption >= 0 ? retrievedOptions[selectedOption] || null : null;
  let optionSchema: S | undefined | null;

  if (option) {
    // merge top level required field
    const { required } = schema;
    optionSchema = required ? (mergeSchemas({ required }, option) as S) : option;
  }

  let optionsUiSchema: UiSchema<T, S, F>[] = [];
  if (ONE_OF_KEY in schema && uiSchema && ONE_OF_KEY in uiSchema) {
    if (Array.isArray(uiSchema[ONE_OF_KEY])) {
      optionsUiSchema = uiSchema[ONE_OF_KEY];
    } else {
      console.warn(`uiSchema.oneOf is not an array for "${title || name}"`);
    }
  } else if (ANY_OF_KEY in schema && uiSchema && ANY_OF_KEY in uiSchema) {
    if (Array.isArray(uiSchema[ANY_OF_KEY])) {
      optionsUiSchema = uiSchema[ANY_OF_KEY];
    } else {
      console.warn(`uiSchema.anyOf is not an array for "${title || name}"`);
    }
  }
  let optionUiSchema = uiSchema;
  if (selectedOption >= 0 && optionsUiSchema.length > selectedOption) {
    optionUiSchema = optionsUiSchema[selectedOption];
  }

  const translateEnum: TranslatableString = title
    ? TranslatableString.TitleOptionPrefix
    : TranslatableString.OptionPrefix;
  const translateParams = title ? [title] : [];
  const enumOptions = retrievedOptions.map((opt: { title?: string }, index: number) => {
    const { title: uiTitle = opt.title } = getUiOptions<T, S, F>(optionsUiSchema[index]);
    return {
      label: uiTitle || translateString(translateEnum, translateParams.concat(String(index + 1))),
      value: index,
    };
  });

  const selector =
    !isOptionalRender || hasFormData ? (
      <Widget
        id={fieldId}
        name={`${name}${schema.oneOf ? '__oneof_select' : '__anyof_select'}`}
        schema={{ type: 'number', default: 0 } as S}
        onChange={onOptionChange}
        onBlur={onBlur}
        onFocus={onFocus}
        disabled={disabled || isEmpty(enumOptions)}
        multiple={false}
        rawErrors={rawErrors}
        errorSchema={fieldErrorSchema}
        value={selectedOption >= 0 ? selectedOption : undefined}
        options={{ enumOptions, ...uiOptions }}
        registry={registry}
        placeholder={placeholder}
        autocomplete={autocomplete}
        autofocus={autofocus}
        label={title ?? name}
        hideLabel={!displayLabel}
        readonly={readonly}
      />
    ) : undefined;

  const optionsSchemaField =
    (optionSchema && optionSchema.type !== 'null' && (
      <_SchemaField {...props} schema={optionSchema} uiSchema={optionUiSchema} />
    )) ||
    null;

  return (
    <MultiSchemaFieldTemplate
      schema={schema}
      registry={registry}
      uiSchema={uiSchema}
      selector={selector}
      optionSchemaField={optionsSchemaField}
    />
  );
}

export default AnyOfField;
