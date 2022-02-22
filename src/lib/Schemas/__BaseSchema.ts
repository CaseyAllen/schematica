import genId from "../utilities/helpers/genCodeSafeId";

//TYPEADDITION
export type SchemaType =
    | "string"
    | "object"
    | "number"
    | "boolean"
    | "array"
    | "null"
    | "any";
export interface BaseSchemaTemplate{
    type: SchemaType;
    name?: string;
}
/**
 * The Class from which all schemas are based from
 * T is the template Type
 */

export abstract class BaseSchema<T extends BaseSchemaTemplate> {
    type: SchemaType;

    /**
     * [INTERNAL]The id of the schema, this is autogenerated and used in generated functions to avoid variable collisions
     */
    id: string;
    /**
     * The name of the schema, used to reference it in other schemas
    */
    name?:string;
    /**
     * The Template from which the schema is derived
     */
    template: T;
    /**
     * A kvp for different utils to persist data
     */
    cache: Map<string, any> = new Map()
    /**
     * [INTERNAL] A conditional
     */
    abstract typecheck:string
    constructor(template:T){
        this.type = template.type
        this.template = template
        this.name=template.name
        this.id=genId(6)
    }

    validateSchema(){}
}
