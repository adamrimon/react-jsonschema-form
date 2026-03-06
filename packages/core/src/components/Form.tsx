import {
  ElementType,
  FormEvent,
  ForwardedRef,
  ReactElement,
  ReactNode,
  Ref,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  createSchemaUtils,
  CustomValidator,
  deepEquals,
  ErrorSchema,
  ErrorSchemaBuilder,
  ErrorTransformer,
  expandUiSchemaDefinitions,
  FieldPathId,
  FieldPathList,
  FormContextType,
  getChangedFields,
  getTemplate,
  getUiOptions,
  isObject,
  mergeObjects,
  PathSchema,
  StrictRJSFSchema,
  Registry,
  RegistryFieldsType,
  RegistryWidgetsType,
  RJSFSchema,
  RJSFValidationError,
  SchemaUtilsType,
  shallowEquals,
  SUBMIT_BTN_OPTIONS_KEY,
  TemplatesType,
  toErrorList,
  toFieldPathId,
  UiSchema,
  UI_DEFINITIONS_KEY,
  UI_GLOBAL_OPTIONS_KEY,
  UI_OPTIONS_KEY,
  ValidationData,
  validationDataMerge,
  ValidatorType,
  Experimental_DefaultFormStateBehavior,
  Experimental_CustomMergeAllOf,
  DEFAULT_ID_SEPARATOR,
  DEFAULT_ID_PREFIX,
  GlobalFormOptions,
  ERRORS_KEY,
  ID_KEY,
  NameGeneratorFunction,
  getUsedFormData,
  getFieldNames,
} from '@rjsf/utils';
import _cloneDeep from 'lodash/cloneDeep';
import _get from 'lodash/get';
import _isEmpty from 'lodash/isEmpty';
import _pick from 'lodash/pick';
import _set from 'lodash/set';
import _toPath from 'lodash/toPath';
import _unset from 'lodash/unset';

import getDefaultRegistry from '../getDefaultRegistry';
import { ADDITIONAL_PROPERTY_KEY_REMOVE, IS_RESET } from './constants';

/** Represents a boolean option that is deprecated.
 * @deprecated - In a future major release, this type will be removed
 */
type DeprecatedBooleanOption = boolean;

/** The properties that are passed to the `Form` */
export interface FormProps<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any> {
  /** The JSON schema object for the form */
  schema: S;
  /** An implementation of the `ValidatorType` interface that is needed for form validation to work */
  validator: ValidatorType<T, S, F>;
  /** The optional children for the form, if provided, it will replace the default `SubmitButton` */
  children?: ReactNode;
  /** The uiSchema for the form */
  uiSchema?: UiSchema<T, S, F>;
  /** The data for the form, used to load a "controlled" form with its current data. If you want an "uncontrolled" form
   * with initial data, then use `initialFormData` instead.
   */
  formData?: T;
  /** The initial data for the form, used to fill an "uncontrolled" form with existing data on the initial render and
   * when `reset()` is called programmatically.
   */
  initialFormData?: T;
  // Form presentation and behavior modifiers
  /** You can provide a `formContext` object to the form, which is passed down to all fields and widgets. Useful for
   * implementing context aware fields and widgets.
   *
   * NOTE: Setting `{readonlyAsDisabled: false}` on the formContext will make the antd theme treat readOnly fields as
   * disabled.
   */
  formContext?: F;
  /** To avoid collisions with existing ids in the DOM, it is possible to change the prefix used for ids;
   * Default is `root`
   */
  idPrefix?: string;
  /** To avoid using a path separator that is present in field names, it is possible to change the separator used for
   * ids (Default is `_`)
   */
  idSeparator?: string;
  /** It's possible to disable the whole form by setting the `disabled` prop. The `disabled` prop is then forwarded down
   * to each field of the form. If you just want to disable some fields, see the `ui:disabled` parameter in `uiSchema`
   */
  disabled?: boolean;
  /** It's possible to make the whole form read-only by setting the `readonly` prop. The `readonly` prop is then
   * forwarded down to each field of the form. If you just want to make some fields read-only, see the `ui:readonly`
   * parameter in `uiSchema`
   */
  readonly?: boolean;
  // Form registry
  /** The dictionary of registered fields in the form */
  fields?: RegistryFieldsType<T, S, F>;
  /** The dictionary of registered templates in the form; Partial allows a subset to be provided beyond the defaults */
  templates?: Partial<Omit<TemplatesType<T, S, F>, 'ButtonTemplates'>> & {
    ButtonTemplates?: Partial<TemplatesType<T, S, F>['ButtonTemplates']>;
  };
  /** The dictionary of registered widgets in the form */
  widgets?: RegistryWidgetsType<T, S, F>;
  // Callbacks
  /** If you plan on being notified every time the form data are updated, you can pass an `onChange` handler, which will
   * receive the same args as `onSubmit` any time a value is updated in the form. Can also return the `id` of the field
   * that caused the change
   */
  onChange?: (data: IChangeEvent<T, S, F>, id?: string) => void;
  /** To react when submitted form data are invalid, pass an `onError` handler. It will be passed the list of
   * encountered errors
   */
  onError?: (errors: RJSFValidationError[]) => void;
  /** You can pass a function as the `onSubmit` prop of your `Form` component to listen to when the form is submitted
   * and its data are valid. It will be passed a result object having a `formData` attribute, which is the valid form
   * data you're usually after. The original event will also be passed as a second parameter
   */
  onSubmit?: (data: IChangeEvent<T, S, F>, event: FormEvent<any>) => void;
  /** Sometimes you may want to trigger events or modify external state when a field has been touched, so you can pass
   * an `onBlur` handler, which will receive the id of the input that was blurred and the field value
   */
  onBlur?: (id: string, data: any) => void;
  /** Sometimes you may want to trigger events or modify external state when a field has been focused, so you can pass
   * an `onFocus` handler, which will receive the id of the input that is focused and the field value
   */
  onFocus?: (id: string, data: any) => void;
  /** The value of this prop will be passed to the `accept-charset` HTML attribute on the form */
  acceptCharset?: string;
  /** The value of this prop will be passed to the `action` HTML attribute on the form
   *
   * NOTE: this just renders the `action` attribute in the HTML markup. There is no real network request being sent to
   * this `action` on submit. Instead, react-jsonschema-form catches the submit event with `event.preventDefault()`
   * and then calls the `onSubmit` function, where you could send a request programmatically with `fetch` or similar.
   */
  action?: string;
  /** The value of this prop will be passed to the `autocomplete` HTML attribute on the form */
  autoComplete?: string;
  /** The value of this prop will be passed to the `class` HTML attribute on the form */
  className?: string;
  /** The value of this prop will be passed to the `enctype` HTML attribute on the form */
  enctype?: string;
  /** The value of this prop will be passed to the `id` HTML attribute on the form */
  id?: string;
  /** The value of this prop will be passed to the `name` HTML attribute on the form */
  name?: string;
  /** The value of this prop will be passed to the `method` HTML attribute on the form */
  method?: string;
  /** It's possible to change the default `form` tag name to a different HTML tag, which can be helpful if you are
   * nesting forms. However, native browser form behaviour, such as submitting when the `Enter` key is pressed, may no
   * longer work
   */
  tagName?: ElementType;
  /** The value of this prop will be passed to the `target` HTML attribute on the form */
  target?: string;
  // Errors and validation
  /** Formerly the `validate` prop; Takes a function that specifies custom validation rules for the form */
  customValidate?: CustomValidator<T, S, F>;
  /** This prop allows passing in custom errors that are augmented with the existing JSON Schema errors on the form; it
   * can be used to implement asynchronous validation. By default, these are non-blocking errors, meaning that you can
   * still submit the form when these are the only errors displayed to the user.
   */
  extraErrors?: ErrorSchema<T>;
  /** If set to true, causes the `extraErrors` to become blocking when the form is submitted */
  extraErrorsBlockSubmit?: boolean;
  /** If set to true, turns off HTML5 validation on the form; Set to `false` by default */
  noHtml5Validate?: boolean;
  /** If set to true, turns off all validation. Set to `false` by default
   *
   * @deprecated - In a future release, this switch may be replaced by making `validator` prop optional
   */
  noValidate?: boolean;
  /** Flag that describes when live validation will be performed. Live validation means that the form will perform
   * validation and show any validation errors whenever the form data is updated, rather than just on submit.
   *
   * If no value (or `false`) is provided, then live validation will not happen. If `true` or `onChange` is provided for
   * the flag, then live validation will be performed after processing of all pending changes has completed. If `onBlur`
   * is provided, then live validation will be performed when a field that was updated is blurred (as a performance
   * optimization).
   *
   * NOTE: In a future major release, the `boolean` options for this flag will be removed
   */
  liveValidate?: 'onChange' | 'onBlur' | DeprecatedBooleanOption;
  /** Flag that describes when live omit will be performed. Live omit happens only when `omitExtraData` is also set to
   * to `true` and the form's data is updated by the user.
   *
   * If no value (or `false`) is provided, then live omit will not happen. If `true` or `onChange` is provided for
   * the flag, then live omit will be performed after processing of all pending changes has completed. If `onBlur`
   * is provided, then live omit will be performed when a field that was updated is blurred (as a performance
   * optimization).
   *
   * NOTE: In a future major release, the `boolean` options for this flag will be removed
   */
  liveOmit?: 'onChange' | 'onBlur' | DeprecatedBooleanOption;
  /** If set to true, then extra form data values that are not in any form field will be removed whenever `onSubmit` is
   * called. Set to `false` by default.
   */
  omitExtraData?: boolean;
  /** When this prop is set to `top` or 'bottom', a list of errors (or the custom error list defined in the `ErrorList`) will also
   * show. When set to false, only inline input validation errors will be shown. Set to `top` by default
   */
  showErrorList?: false | 'top' | 'bottom';
  /** A function can be passed to this prop in order to make modifications to the default errors resulting from JSON
   * Schema validation
   */
  transformErrors?: ErrorTransformer<T, S, F>;
  /** If set to true, then the first field with an error will receive the focus when the form is submitted with errors
   */
  focusOnFirstError?: boolean | ((error: RJSFValidationError) => void);
  /** Optional string translation function, if provided, allows users to change the translation of the RJSF internal
   * strings. Some strings contain replaceable parameter values as indicated by `%1`, `%2`, etc. The number after the
   * `%` indicates the order of the parameter. The ordering of parameters is important because some languages may choose
   * to put the second parameter before the first in its translation.
   */
  translateString?: Registry['translateString'];
  /** Optional function to generate custom HTML `name` attributes for form fields.
   */
  nameGenerator?: NameGeneratorFunction;
  /** Optional flag that, when set to true, will cause the `FallbackField` to render a type selector for unsupported
   * fields instead of the default UnsupportedField error UI.
   */
  useFallbackUiForUnsupportedType?: boolean;
  /** Optional configuration object with flags, if provided, allows users to override default form state behavior
   * Currently only affecting minItems on array fields and handling of setting defaults based on the value of
   * `emptyObjectFields`
   */
  experimental_defaultFormStateBehavior?: Experimental_DefaultFormStateBehavior;
  /**
   * Controls the component update strategy used by React.memo's comparator.
   *
   * - `'customDeep'`: Uses RJSF's custom deep equality checks via the `deepEquals` utility function,
   *   which treats all functions as equivalent and provides optimized performance for form data comparisons.
   * - `'shallow'`: Uses shallow comparison of props. This matches React's PureComponent behavior.
   * - `'always'`: Always rerenders when called. This matches React's Component behavior.
   *
   * @default 'customDeep'
   */
  experimental_componentUpdateStrategy?: 'customDeep' | 'shallow' | 'always';
  /** Optional function that allows for custom merging of `allOf` schemas
   */
  experimental_customMergeAllOf?: Experimental_CustomMergeAllOf<S>;
  // Private
  /**
   * _internalFormWrapper is currently used by the semantic-ui theme to provide a custom wrapper around `<Form />`
   * that supports the proper rendering of those themes. To use this prop, one must pass a component that takes two
   * props: `children` and `as`. That component, at minimum, should render the `children` inside of a <form /> tag
   * unless `as` is provided, in which case, use the `as` prop in place of `<form />`.
   * i.e.:
   * ```
   * export default function InternalForm({ children, as }) {
   *   const FormTag = as || 'form';
   *   return <FormTag>{children}</FormTag>;
   * }
   * ```
   *
   * Use at your own risk as this prop is private and may change at any time without notice.
   */
  _internalFormWrapper?: ElementType;
  /** Support receiving a React ref to the Form */
  ref?: Ref<FormHandle>;
}

/** The data that is contained within the state for the `Form` */
export interface FormState<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any> {
  /** The JSON schema object for the form */
  schema: S;
  /** The uiSchema for the form */
  uiSchema: UiSchema<T, S, F>;
  /** The `FieldPathId` for the form, computed from the `schema`, the `rootFieldId`, the `idPrefix` and
   * `idSeparator` props.
   */
  fieldPathId: FieldPathId;
  /** The schemaUtils implementation used by the `Form`, created from the `validator` and the `schema` */
  schemaUtils: SchemaUtilsType<T, S, F>;
  /** The current data for the form, computed from the `formData` prop and the changes made by the user */
  formData?: T;
  /** Flag indicating whether the form is in edit mode, true when `formData` is passed to the form, otherwise false */
  edit: boolean;
  /** The current list of errors for the form, includes `extraErrors` */
  errors: RJSFValidationError[];
  /** The current errors, in `ErrorSchema` format, for the form, includes `extraErrors` */
  errorSchema: ErrorSchema<T>;
  // Private
  /** The current list of errors for the form directly from schema validation, does NOT include `extraErrors` */
  schemaValidationErrors: RJSFValidationError[];
  /** The current errors, in `ErrorSchema` format, for the form directly from schema validation, does NOT include
   * `extraErrors`
   */
  schemaValidationErrorSchema: ErrorSchema<T>;
  /** A container used to handle custom errors provided via `onChange` */
  customErrors?: ErrorSchemaBuilder<T>;
  /** @description result of schemaUtils.retrieveSchema(schema, formData). This a memoized value to avoid re calculate at internal functions (getStateFromProps, onChange) */
  retrievedSchema: S;
  /** Flag indicating whether the initial form defaults have been generated */
  initialDefaultsGenerated: boolean;
  /** The registry (re)computed only when props changed */
  registry: Registry<T, S, F>;
  /** @deprecated Tracks the previous `extraErrors` prop reference — only used by the legacy class component */
  _prevExtraErrors?: ErrorSchema<T>;
}

/** The public imperative API exposed via ref */
export interface FormHandle {
  /** Programmatically submit the form */
  submit: () => void;
  /** Programmatically validate the form. Returns true if valid, false otherwise. */
  validateForm: () => boolean;
  /** Reset the form to default values */
  reset: () => void;
  /** Set a field value by path */
  setFieldValue: (fieldPath: string | FieldPathList, newValue?: any) => void;
  /** @deprecated Use SchemaUtils.omitExtraData instead */
  omitExtraData: (formData?: any) => any;
  /** @deprecated */
  getUsedFormData: (formData: any, fields: string[]) => any;
  /** @deprecated */
  getFieldNames: (pathSchema: PathSchema<any>, formData?: any) => string[][];
  /** @deprecated - this is an internal method exposed for backward compatibility */
  validateFormWithFormData: (formData?: any) => boolean;
}

/** The event data passed when changes have been made to the form, includes everything from the `FormState` except
 * the schema validation errors. An additional `status` is added when returned from `onSubmit`
 */
export interface IChangeEvent<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
> extends Pick<
  FormState<T, S, F>,
  'schema' | 'uiSchema' | 'fieldPathId' | 'schemaUtils' | 'formData' | 'edit' | 'errors' | 'errorSchema'
> {
  /** The status of the form when submitted */
  status?: 'submitted';
}

/** Converts the full `FormState` into the `IChangeEvent` version by picking out the public values
 *
 * @param state - The state of the form
 * @param status - The status provided by the onSubmit
 * @returns - The `IChangeEvent` for the state
 */
function toIChangeEvent<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  state: FormState<T, S, F>,
  status?: IChangeEvent['status'],
): IChangeEvent<T, S, F> {
  return {
    ..._pick(state, ['schema', 'uiSchema', 'fieldPathId', 'schemaUtils', 'formData', 'edit', 'errors', 'errorSchema']),
    ...(status !== undefined && { status }),
  };
}

/** Merges `extraErrors` and `customErrors` into the given `schemaValidation`. */
function mergeErrors<T = any>(
  schemaValidation: ValidationData<T>,
  extraErrors?: ErrorSchema<T>,
  customErrors?: ErrorSchemaBuilder<T>,
): ValidationData<T> {
  let errorSchema: ErrorSchema<T> = schemaValidation.errorSchema;
  let errors: RJSFValidationError[] = schemaValidation.errors;
  if (extraErrors) {
    const merged = validationDataMerge(schemaValidation, extraErrors);
    errorSchema = merged.errorSchema;
    errors = merged.errors;
  }
  if (customErrors) {
    const merged = validationDataMerge(schemaValidation, customErrors.ErrorSchema, true);
    errorSchema = merged.errorSchema;
    errors = merged.errors;
  }
  return { errors, errorSchema };
}

/** Extracts the `GlobalFormOptions` from the given Form `props`. */
function getGlobalFormOptions<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: FormProps<T, S, F>,
): GlobalFormOptions {
  const {
    uiSchema = {},
    experimental_componentUpdateStrategy,
    idSeparator = DEFAULT_ID_SEPARATOR,
    idPrefix = DEFAULT_ID_PREFIX,
    nameGenerator,
    useFallbackUiForUnsupportedType = false,
  } = props;
  const rootFieldId = uiSchema['ui:rootFieldId'];
  return {
    idPrefix: rootFieldId || idPrefix,
    idSeparator,
    useFallbackUiForUnsupportedType,
    ...(experimental_componentUpdateStrategy !== undefined && { experimental_componentUpdateStrategy }),
    ...(nameGenerator !== undefined && { nameGenerator }),
  };
}

/** Builds the registry for the form from the given props, schema and schemaUtils. */
function buildRegistry<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: FormProps<T, S, F>,
  rootSchema: S,
  schemaUtils: SchemaUtilsType<T, S, F>,
): Registry<T, S, F> {
  const { translateString: customTranslateString, uiSchema = {} } = props;
  const { fields, templates, widgets, formContext, translateString } = getDefaultRegistry<T, S, F>();
  return {
    fields: { ...fields, ...props.fields },
    templates: {
      ...templates,
      ...props.templates,
      ButtonTemplates: {
        ...templates.ButtonTemplates,
        ...props.templates?.ButtonTemplates,
      },
    },
    widgets: { ...widgets, ...props.widgets },
    rootSchema,
    formContext: props.formContext || formContext,
    schemaUtils,
    translateString: customTranslateString || translateString,
    globalUiOptions: uiSchema[UI_GLOBAL_OPTIONS_KEY],
    globalFormOptions: getGlobalFormOptions(props),
    uiSchemaDefinitions: uiSchema[UI_DEFINITIONS_KEY] ?? {},
  };
}

/** Returns the new `retrievedSchema` if it differs from `prevRetrievedSchema`, otherwise returns the previous
 * reference to preserve AJV cache hits.
 */
function updateRetrievedSchema<S extends StrictRJSFSchema = RJSFSchema>(
  retrievedSchema: S,
  prevRetrievedSchema?: S,
): S {
  if (prevRetrievedSchema && deepEquals(retrievedSchema, prevRetrievedSchema)) {
    return prevRetrievedSchema;
  }
  return retrievedSchema;
}

/** Validates `formData` against the given `schema` using `schemaUtils`. */
function validateFormData<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  formData: T | undefined,
  schema: S,
  schemaUtils: SchemaUtilsType<T, S, F>,
  customValidate?: CustomValidator<T, S, F>,
  transformErrors?: ErrorTransformer<T, S, F>,
  uiSchema?: UiSchema<T, S, F>,
  retrievedSchema?: S,
): ValidationData<T> {
  const resolvedSchema = retrievedSchema ?? schemaUtils.retrieveSchema(schema, formData);
  return schemaUtils
    .getValidator()
    .validateFormData(formData, resolvedSchema, customValidate, transformErrors, uiSchema);
}

/** Performs live validation and merges errors. */
function liveValidate<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  rootSchema: S,
  schemaUtils: SchemaUtilsType<T, S, F>,
  originalErrorSchema: ErrorSchema<T>,
  customValidate?: CustomValidator<T, S, F>,
  transformErrors?: ErrorTransformer<T, S, F>,
  uiSchema?: UiSchema<T, S, F>,
  formData?: T,
  extraErrors?: ErrorSchema<T>,
  customErrors?: ErrorSchemaBuilder<T>,
  retrievedSchema?: S,
  mergeIntoOriginalErrorSchema = false,
) {
  const schemaValidation = validateFormData(
    formData,
    rootSchema,
    schemaUtils,
    customValidate,
    transformErrors,
    uiSchema,
    retrievedSchema,
  );
  const errors = schemaValidation.errors;
  let errorSchema = schemaValidation.errorSchema;
  if (mergeIntoOriginalErrorSchema) {
    errorSchema = mergeObjects(
      originalErrorSchema,
      schemaValidation.errorSchema,
      'preventDuplicates',
    ) as ErrorSchema<T>;
  }
  const schemaValidationErrors = errors;
  const schemaValidationErrorSchema = errorSchema;
  const mergedErrors = mergeErrors({ errorSchema, errors }, extraErrors, customErrors);
  return { ...mergedErrors, schemaValidationErrors, schemaValidationErrorSchema };
}

/** Computes the full form state from the given props and current state. */
function computeFormState<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: FormProps<T, S, F>,
  state: Partial<FormState<T, S, F>> = {},
  inputFormData?: T,
  retrievedSchema?: S,
  isSchemaChanged = false,
  formDataChangedFields: string[] = [],
  skipLiveValidate = false,
  allowSkipDefaults = false,
): FormState<T, S, F> {
  const schema = props.schema;
  const validator = props.validator;
  const uiSchema: UiSchema<T, S, F> = props.uiSchema || ({} as UiSchema<T, S, F>);
  const isUncontrolled = props.formData === undefined;
  const edit = typeof inputFormData !== 'undefined';
  const liveValidateFlag = props.liveValidate;
  const mustValidate = edit && !props.noValidate && liveValidateFlag;

  let schemaUtils: SchemaUtilsType<T, S, F> = state.schemaUtils as SchemaUtilsType<T, S, F>;
  if (
    !schemaUtils ||
    schemaUtils.doesSchemaUtilsDiffer(
      validator,
      schema,
      props.experimental_defaultFormStateBehavior,
      props.experimental_customMergeAllOf,
    )
  ) {
    schemaUtils = createSchemaUtils<T, S, F>(
      validator,
      schema,
      props.experimental_defaultFormStateBehavior,
      props.experimental_customMergeAllOf,
    );
  }

  const rootSchema = schemaUtils.getRootSchema();

  // When called from prop-change detection (allowSkipDefaults=true), skip getDefaultFormState if formData
  // hasn't changed from state. This prevents re-deriving values (e.g., undefined → defaults for oneOf null options).
  const canSkipDefaults =
    allowSkipDefaults &&
    !isSchemaChanged &&
    state.initialDefaultsGenerated &&
    (inputFormData as unknown) !== IS_RESET &&
    deepEquals(inputFormData, state.formData);

  let formData: T;
  if (canSkipDefaults) {
    formData = state.formData as T;
  } else {
    let defaultsFormData = inputFormData;
    if (inputFormData === IS_RESET) {
      defaultsFormData = undefined;
    } else if (inputFormData === undefined && isUncontrolled) {
      defaultsFormData = state.formData;
    }
    formData = schemaUtils.getDefaultFormState(
      rootSchema,
      defaultsFormData,
      false,
      state.initialDefaultsGenerated,
    ) as T;
  }
  const _retrievedSchema = updateRetrievedSchema(
    retrievedSchema ?? schemaUtils.retrieveSchema(rootSchema, formData),
    state.retrievedSchema,
  );

  const getCurrentErrors = (): ValidationData<T> => {
    if (props.noValidate || isSchemaChanged) {
      return { errors: [], errorSchema: {} };
    } else if (!props.liveValidate) {
      return {
        errors: state.schemaValidationErrors || [],
        errorSchema: (state.schemaValidationErrorSchema || {}) as ErrorSchema<T>,
      };
    }
    return {
      errors: state.errors || [],
      errorSchema: (state.errorSchema || {}) as ErrorSchema<T>,
    };
  };

  let errors: RJSFValidationError[];
  let errorSchema: ErrorSchema<T> | undefined;
  let schemaValidationErrors: RJSFValidationError[] = state.schemaValidationErrors || [];
  let schemaValidationErrorSchema: ErrorSchema<T> = (state.schemaValidationErrorSchema || {}) as ErrorSchema<T>;

  if (mustValidate && !skipLiveValidate) {
    const liveValidation = liveValidate(
      rootSchema,
      schemaUtils,
      (state.errorSchema || {}) as ErrorSchema<T>,
      props.customValidate,
      props.transformErrors,
      props.uiSchema,
      formData,
      props.extraErrors,
      state.customErrors,
      retrievedSchema,
      retrievedSchema !== undefined,
    );
    errors = liveValidation.errors;
    errorSchema = liveValidation.errorSchema;
    schemaValidationErrors = liveValidation.schemaValidationErrors;
    schemaValidationErrorSchema = liveValidation.schemaValidationErrorSchema;
  } else {
    const currentErrors = getCurrentErrors();
    errors = currentErrors.errors;
    errorSchema = currentErrors.errorSchema;
    if (formDataChangedFields.length > 0 && !mustValidate) {
      const newErrorSchema = formDataChangedFields.reduce(
        (acc, key) => {
          acc[key] = undefined;
          return acc;
        },
        {} as Record<string, undefined>,
      );
      errorSchema = schemaValidationErrorSchema = mergeObjects(
        currentErrors.errorSchema,
        newErrorSchema,
        'preventDuplicates',
      ) as ErrorSchema<T>;
    }
    const merged = mergeErrors({ errorSchema, errors }, props.extraErrors, state.customErrors);
    errors = merged.errors;
    errorSchema = merged.errorSchema;
  }

  const newRegistry = buildRegistry(props, rootSchema, schemaUtils);
  const registry = deepEquals(state.registry, newRegistry) ? (state.registry as Registry<T, S, F>) : newRegistry;

  const expandedUiSchema: UiSchema<T, S, F> = registry.uiSchemaDefinitions
    ? expandUiSchemaDefinitions<T, S, F>(rootSchema, uiSchema, registry)
    : uiSchema;

  const fieldPathId =
    state.fieldPathId && state.fieldPathId?.[ID_KEY] === registry.globalFormOptions.idPrefix
      ? state.fieldPathId
      : toFieldPathId('', registry.globalFormOptions);

  const nextState: FormState<T, S, F> = {
    schemaUtils,
    schema: rootSchema,
    uiSchema: expandedUiSchema,
    fieldPathId,
    formData,
    edit,
    errors,
    errorSchema: errorSchema as ErrorSchema<T>,
    schemaValidationErrors,
    schemaValidationErrorSchema,
    retrievedSchema: _retrievedSchema,
    initialDefaultsGenerated: true,
    registry,
  };
  return nextState;
}

/** The definition of a pending change that will be processed in the `onChange` handler
 */
interface PendingChange<T> {
  /** The path into the formData/errorSchema at which the `newValue`/`newErrorSchema` will be set */
  path: FieldPathList;
  /** The new value to set into the formData */
  newValue?: T;
  /** The new errors to be set into the errorSchema, if any */
  newErrorSchema?: ErrorSchema<T>;
  /** The optional id of the field for which the change is being made */
  id?: string;
}

/** The `Form` component renders the outer form and all the fields defined in the `schema` */
function FormInner<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: FormProps<T, S, F>,
  ref: ForwardedRef<FormHandle>,
) {
  if (!props.validator) {
    throw new Error('A validator is required for Form functionality to work');
  }

  // ---- State ----
  const [formState, setFormState] = useState<FormState<T, S, F>>(() => {
    const formData = props.formData ?? props.initialFormData;
    return computeFormState(props, {}, formData, undefined, false, [], true);
  });

  // ---- Refs (values that don't affect rendering: latest-value accessors, DOM, mutable queues) ----
  const stateRef = useRef(formState);
  stateRef.current = formState;
  const propsRef = useRef(props);
  propsRef.current = props;
  const formElement = useRef<any>(null);
  const pendingChanges = useRef<PendingChange<T>[]>([]);

  // ---- Prop-change detection (per React docs: "Adjusting some state when a prop changes") ----
  const [prevProps, setPrevProps] = useState(props);
  const [pendingPropOnChange, setPendingPropOnChange] = useState<IChangeEvent<T, S, F> | null>(null);
  if (prevProps !== props) {
    setPrevProps(props);
    if (!deepEquals(props, prevProps)) {
      const formDataChangedFields = getChangedFields(props.formData, prevProps.formData);
      const stateDataChangedFields = getChangedFields(props.formData, formState.formData);
      const isSchemaChanged = !deepEquals(prevProps.schema, props.schema);
      const isFormDataChanged = formDataChangedFields.length > 0 || !deepEquals(prevProps.formData, props.formData);
      const isStateDataChanged = stateDataChangedFields.length > 0 || !deepEquals(formState.formData, props.formData);

      const nextState = computeFormState(
        props,
        formState,
        props.formData,
        isSchemaChanged || isFormDataChanged ? undefined : formState.retrievedSchema,
        isSchemaChanged,
        formDataChangedFields,
        !isStateDataChanged,
        true,
      );

      const { errors, errorSchema } = mergeErrors<T>(
        { errors: nextState.schemaValidationErrors, errorSchema: nextState.schemaValidationErrorSchema },
        props.extraErrors,
        nextState.customErrors,
      );
      const finalNextState: FormState<T, S, F> = { ...nextState, errors, errorSchema };

      if (!deepEquals(finalNextState, formState)) {
        stateRef.current = finalNextState;
        setFormState(finalNextState);

        const nextStateDiffersFromProps = !deepEquals(finalNextState.formData, props.formData);
        if (nextStateDiffersFromProps && !deepEquals(finalNextState.formData, formState.formData)) {
          setPendingPropOnChange(toIChangeEvent(finalNextState));
        }
      }
    }
  }

  // ---- Fire initial onChange after mount (matches class constructor behaviour) ----
  useEffect(() => {
    const p = propsRef.current;
    const initialFormData = p.formData ?? p.initialFormData;
    if (p.onChange && !deepEquals(stateRef.current.formData, initialFormData)) {
      p.onChange(toIChangeEvent(stateRef.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Fire onChange scheduled by prop-change detection ----
  useEffect(() => {
    if (pendingPropOnChange) {
      setPendingPropOnChange(null);
      if (propsRef.current.onChange) {
        propsRef.current.onChange(pendingPropOnChange);
      }
    }
  }, [pendingPropOnChange]);

  // ---- Helpers ----

  const focusOnError = useCallback((error: RJSFValidationError) => {
    const { idPrefix = 'root', idSeparator = '_' } = propsRef.current;
    const { property } = error;
    const path = _toPath(property);
    if (path[0] === '') {
      path[0] = idPrefix;
    } else {
      path.unshift(idPrefix);
    }
    const elementId = path.join(idSeparator);
    let field = formElement.current?.elements?.[elementId];
    if (!field) {
      field = formElement.current?.querySelector(`input[id^="${elementId}"`);
    }
    if (field?.length) {
      field = field[0];
    }
    if (field) {
      field.focus();
    }
  }, []);

  const validateFormWithFormDataFn = useCallback(
    (formData?: T): boolean => {
      const p = propsRef.current;
      const s = stateRef.current;
      const { extraErrors, extraErrorsBlockSubmit, focusOnFirstError, onError } = p;
      const schemaValidation = validateFormData(
        formData,
        s.schema,
        s.schemaUtils,
        p.customValidate,
        p.transformErrors,
        p.uiSchema,
      );
      let errors = schemaValidation.errors;
      let errorSchema = schemaValidation.errorSchema;
      const schemaValidationErrors = errors;
      const schemaValidationErrorSchema = errorSchema;
      const hasError = errors.length > 0 || (extraErrors && extraErrorsBlockSubmit);
      if (hasError) {
        if (extraErrors) {
          const merged = validationDataMerge(schemaValidation, extraErrors);
          errorSchema = merged.errorSchema;
          errors = merged.errors;
        }
        if (focusOnFirstError) {
          if (typeof focusOnFirstError === 'function') {
            focusOnFirstError(errors[0]);
          } else {
            focusOnError(errors[0]);
          }
        }
        const newState: FormState<T, S, F> = {
          ...s,
          errors,
          errorSchema,
          schemaValidationErrors,
          schemaValidationErrorSchema,
        };
        stateRef.current = newState;
        setFormState(newState);
        if (onError) {
          onError(errors);
        } else {
          console.error('Form validation failed', errors);
        }
      } else if (s.errors.length > 0) {
        const newState: FormState<T, S, F> = {
          ...s,
          errors: [] as RJSFValidationError[],
          errorSchema: {} as ErrorSchema<T>,
          schemaValidationErrors: [] as RJSFValidationError[],
          schemaValidationErrorSchema: {} as ErrorSchema<T>,
        };
        stateRef.current = newState;
        setFormState(newState);
      }
      return !hasError;
    },
    [focusOnError],
  );

  // ---- processPendingChange (pending-changes queue with refs for synchronous state tracking) ----

  const processPendingChange = useCallback((): void => {
    if (pendingChanges.current.length === 0) {
      return;
    }
    const p = propsRef.current;
    const s = stateRef.current;
    const { newValue, path, id } = pendingChanges.current[0];
    const { newErrorSchema } = pendingChanges.current[0];
    const { extraErrors, omitExtraData, liveOmit, noValidate, liveValidate: liveValidateFlag, onChange } = p;
    const { formData: oldFormData, schemaUtils, schema, fieldPathId, schemaValidationErrorSchema, errors } = s;
    let { customErrors, errorSchema: originalErrorSchema } = s;
    const rootPathId = fieldPathId.path[0] || '';

    const isRootPath = !path || path.length === 0 || (path.length === 1 && path[0] === rootPathId);
    let retrievedSchema = s.retrievedSchema;
    let formData = isRootPath ? newValue : _cloneDeep(oldFormData);

    const hasOnlyUndefinedValues =
      isObject(formData) &&
      Object.keys(formData as object).length > 0 &&
      Object.values(formData as object).every((v) => v === undefined);
    const wasPreviouslyNull = oldFormData === null || oldFormData === undefined;
    const inputForDefaults = hasOnlyUndefinedValues && wasPreviouslyNull ? undefined : formData;

    if (isObject(formData) || Array.isArray(formData)) {
      if (newValue === ADDITIONAL_PROPERTY_KEY_REMOVE) {
        _unset(formData, path);
      } else if (!isRootPath) {
        _set(formData, path, newValue);
      }
      const newComputedState = computeFormState(p, s, inputForDefaults, undefined, undefined, undefined, true);
      formData = newComputedState.formData;
      retrievedSchema = newComputedState.retrievedSchema;
    }

    const mustValidate = !noValidate && (liveValidateFlag === true || liveValidateFlag === 'onChange');
    let stateUpdate: Partial<FormState<T, S, F>> = { formData, schema };
    let newFormData = formData;

    if (omitExtraData === true && (liveOmit === true || liveOmit === 'onChange')) {
      newFormData = schemaUtils.omitExtraData(schema, formData);
      stateUpdate = { formData: newFormData };
    }

    if (newErrorSchema) {
      // @ts-expect-error TS2590, because getting from the error schema is confusing TS
      const oldValidationError = !isRootPath ? _get(schemaValidationErrorSchema, path) : schemaValidationErrorSchema;
      if (!_isEmpty(oldValidationError)) {
        if (!isRootPath) {
          _set(originalErrorSchema, path, newErrorSchema);
        } else {
          originalErrorSchema = newErrorSchema;
        }
      } else {
        if (!customErrors) {
          customErrors = new ErrorSchemaBuilder<T>();
        }
        if (isRootPath) {
          const errs = _get(newErrorSchema, ERRORS_KEY);
          if (errs) {
            customErrors.setErrors(errs);
          }
        } else {
          _set(customErrors.ErrorSchema, path, newErrorSchema);
        }
      }
    } else if (customErrors && _get(customErrors.ErrorSchema, [...path, ERRORS_KEY])) {
      customErrors.clearErrors(path);
    }

    if (mustValidate && pendingChanges.current.length === 1) {
      const liveValidation = liveValidate(
        schema,
        schemaUtils,
        originalErrorSchema,
        p.customValidate,
        p.transformErrors,
        p.uiSchema,
        newFormData,
        extraErrors,
        customErrors,
        retrievedSchema,
      );
      stateUpdate = { formData: newFormData, ...liveValidation, customErrors };
    } else if (!noValidate && newErrorSchema) {
      const merged = mergeErrors({ errorSchema: originalErrorSchema, errors }, extraErrors, customErrors);
      stateUpdate = { formData: newFormData, ...merged, customErrors };
    }

    const newFullState: FormState<T, S, F> = { ...s, ...stateUpdate };
    stateRef.current = newFullState;
    setFormState(newFullState);

    if (onChange) {
      onChange(toIChangeEvent(newFullState), id);
    }

    pendingChanges.current.shift();
    processPendingChange();
  }, []);

  // ---- Event handlers ----

  const handleChange = useCallback(
    (newValue: T | undefined, path: FieldPathList, newErrorSchema?: ErrorSchema<T>, id?: string) => {
      pendingChanges.current.push({ newValue, path, newErrorSchema, id });
      if (pendingChanges.current.length === 1) {
        processPendingChange();
      }
    },
    [processPendingChange],
  );

  const handleBlur = useCallback((id: string, data: any) => {
    const p = propsRef.current;
    const s = stateRef.current;
    if (p.onBlur) {
      p.onBlur(id, data);
    }
    if ((p.omitExtraData === true && p.liveOmit === 'onBlur') || p.liveValidate === 'onBlur') {
      let newFormData: T | undefined = s.formData;
      let stateUpdate: Partial<FormState<T, S, F>> = { formData: newFormData };
      if (p.omitExtraData === true && p.liveOmit === 'onBlur') {
        newFormData = s.schemaUtils.omitExtraData(s.schema, s.formData);
        stateUpdate = { formData: newFormData };
      }
      if (p.liveValidate === 'onBlur') {
        const liveValidation = liveValidate(
          s.schema,
          s.schemaUtils,
          s.errorSchema,
          p.customValidate,
          p.transformErrors,
          p.uiSchema,
          newFormData,
          p.extraErrors,
          s.customErrors,
          s.retrievedSchema,
        );
        stateUpdate = { formData: newFormData, ...liveValidation, customErrors: s.customErrors };
      }
      const hasChanges = Object.keys(stateUpdate)
        .filter((key) => !key.startsWith('schemaValidation'))
        .some((key) => !deepEquals(_get(s, key), _get(stateUpdate, key)));
      const newFullState: FormState<T, S, F> = { ...s, ...stateUpdate };
      stateRef.current = newFullState;
      setFormState(newFullState);
      if (p.onChange && hasChanges) {
        p.onChange(toIChangeEvent(newFullState), id);
      }
    }
  }, []);

  const handleFocus = useCallback((id: string, data: any) => {
    if (propsRef.current.onFocus) {
      propsRef.current.onFocus(id, data);
    }
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<any>) => {
      event.preventDefault();
      if (event.target !== event.currentTarget) {
        return;
      }
      event.persist();
      const p = propsRef.current;
      const s = stateRef.current;
      let newFormData = s.formData;
      if (p.omitExtraData === true) {
        newFormData = s.schemaUtils.omitExtraData(s.schema, newFormData);
      }
      if (p.noValidate || validateFormWithFormDataFn(newFormData)) {
        const errorSchema = p.extraErrors || {};
        const errors = p.extraErrors ? toErrorList(p.extraErrors) : [];
        const newState: FormState<T, S, F> = {
          ...s,
          formData: newFormData,
          errors: errors as RJSFValidationError[],
          errorSchema: errorSchema as ErrorSchema<T>,
          schemaValidationErrors: [] as RJSFValidationError[],
          schemaValidationErrorSchema: {} as ErrorSchema<T>,
        };
        stateRef.current = newState;
        setFormState(newState);
        if (p.onSubmit) {
          p.onSubmit(toIChangeEvent({ ...newState, formData: newFormData } as FormState<T, S, F>, 'submitted'), event);
        }
      }
    },
    [validateFormWithFormDataFn],
  );

  const handleReset = useCallback(() => {
    const p = propsRef.current;
    const s = stateRef.current;
    const initialFD = p.formData ?? p.initialFormData ?? (IS_RESET as T);
    const newComputedState = computeFormState(p, s, initialFD, undefined, undefined, undefined, true);
    const newState: FormState<T, S, F> = {
      ...s,
      formData: newComputedState.formData,
      errorSchema: {} as ErrorSchema<T>,
      errors: [] as RJSFValidationError[],
      schemaValidationErrors: [] as RJSFValidationError[],
      schemaValidationErrorSchema: {} as ErrorSchema<T>,
      initialDefaultsGenerated: false,
      customErrors: undefined,
    };
    stateRef.current = newState;
    setFormState(newState);
    if (p.onChange) {
      p.onChange(toIChangeEvent(newState));
    }
  }, []);

  const handleSetFieldValue = useCallback(
    (fieldPath: string | FieldPathList, newValue?: T) => {
      const s = stateRef.current;
      const path = Array.isArray(fieldPath) ? fieldPath : fieldPath.split('.');
      const fpId = toFieldPathId('', s.registry.globalFormOptions, path);
      handleChange(newValue, path, undefined, fpId[ID_KEY]);
    },
    [handleChange],
  );

  // ---- Imperative handle ----

  useImperativeHandle(
    ref,
    () => ({
      submit: () => {
        if (formElement.current) {
          const submitCustomEvent = new CustomEvent('submit', { cancelable: true });
          submitCustomEvent.preventDefault();
          formElement.current.dispatchEvent(submitCustomEvent);
          formElement.current.requestSubmit();
        }
      },
      validateForm: () => {
        const p = propsRef.current;
        const s = stateRef.current;
        let newFormData = s.formData;
        if (p.omitExtraData === true) {
          newFormData = s.schemaUtils.omitExtraData(s.schema, newFormData);
        }
        return validateFormWithFormDataFn(newFormData);
      },
      reset: handleReset,
      setFieldValue: handleSetFieldValue,
      validateFormWithFormData: validateFormWithFormDataFn,
      omitExtraData: (formData?: T) => stateRef.current.schemaUtils.omitExtraData(stateRef.current.schema, formData),
      getUsedFormData: (formData: T | undefined, fields: string[]) => getUsedFormData(formData, fields),
      getFieldNames: (pathSchema: PathSchema<any>, formData?: any) => getFieldNames(pathSchema, formData),
    }),
    [handleReset, handleSetFieldValue, validateFormWithFormDataFn],
  );

  // ---- Render ----

  const {
    children,
    id,
    className = '',
    tagName,
    name,
    method,
    target,
    action,
    autoComplete,
    enctype,
    acceptCharset,
    noHtml5Validate = false,
    disabled,
    readonly,
    showErrorList = 'top',
    _internalFormWrapper,
  } = props;

  const { schema, uiSchema, formData, errorSchema, fieldPathId, registry } = formState;
  const { SchemaField: _SchemaField } = registry.fields;
  const { SubmitButton } = registry.templates.ButtonTemplates;
  const as = _internalFormWrapper ? tagName : undefined;
  const FormTag = _internalFormWrapper || tagName || 'form';

  let { [SUBMIT_BTN_OPTIONS_KEY]: submitOptions = {} } = getUiOptions<T, S, F>(uiSchema);
  if (disabled) {
    submitOptions = { ...submitOptions, props: { ...submitOptions.props, disabled: true } };
  }
  const submitUiSchema = { [UI_OPTIONS_KEY]: { [SUBMIT_BTN_OPTIONS_KEY]: submitOptions } };

  const renderErrors = () => {
    const options = getUiOptions<T, S, F>(uiSchema);
    const ErrorListTemplate = getTemplate<'ErrorListTemplate', T, S, F>('ErrorListTemplate', registry, options);
    if (formState.errors?.length) {
      return (
        <ErrorListTemplate
          errors={formState.errors}
          errorSchema={formState.errorSchema || {}}
          schema={schema}
          uiSchema={uiSchema}
          registry={registry}
        />
      );
    }
    return null;
  };

  return (
    <FormTag
      className={className || 'rjsf'}
      id={id}
      name={name}
      method={method}
      target={target}
      action={action}
      autoComplete={autoComplete}
      encType={enctype}
      acceptCharset={acceptCharset}
      noValidate={noHtml5Validate}
      onSubmit={handleSubmit}
      as={as}
      ref={formElement}
    >
      {showErrorList === 'top' && renderErrors()}
      <_SchemaField
        name=''
        schema={schema}
        uiSchema={uiSchema}
        errorSchema={errorSchema}
        fieldPathId={fieldPathId}
        formData={formData}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        registry={registry}
        disabled={disabled}
        readonly={readonly}
      />
      {children ? children : <SubmitButton uiSchema={submitUiSchema} registry={registry} />}
      {showErrorList === 'bottom' && renderErrors()}
    </FormTag>
  );
}

/** @internal */
interface FormComponent {
  <T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
    props: FormProps<T, S, F> & { ref?: Ref<FormHandle> },
  ): ReactElement | null;
  displayName?: string;
}

const Form: FormComponent = memo(forwardRef(FormInner), (prevProps, nextProps) => {
  const { experimental_componentUpdateStrategy = 'customDeep' } = prevProps;
  if (experimental_componentUpdateStrategy === 'always') {
    return false;
  }
  if (experimental_componentUpdateStrategy === 'shallow') {
    return shallowEquals(prevProps, nextProps);
  }
  return deepEquals(prevProps, nextProps);
}) as unknown as FormComponent;

export default Form;
