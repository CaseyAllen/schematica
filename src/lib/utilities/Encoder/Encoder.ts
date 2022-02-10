import { StringSchema } from '../../Schemas';
import Validator from "../Validator/Validator";
import { BooleanSchema, GenericSchema, NumberSchema, ObjectSchema } from "../../Schemas";
import ERR_INVALID_DATA from './errors/ERR_INVALID_DATA';
//@ts-expect-error
import flatstr from "flatstr"

interface EncoderOpts {
    validator?: Validator;
}

/**
 * Transforms JS objects, numbers, booleans, etc. into strings
 */
export default class Encoder {
    private validator: Validator;
    constructor(opts: EncoderOpts = {}) {
        opts.validator
            ? (this.validator = opts.validator)
            : (this.validator = new Validator());
    }
    buildJson(object: any, schema: ObjectSchema) {
        if (schema.additionalProperties) {
            return JSON.stringify(object);
        }
        let json = "{";
        schema.properties.forEach((value, key) => {
            const encoder = value.cache.get("serializer")
            
            const encode = object[key]
            if(!encode && !schema.required.includes(key)){
                return
            }
            const encoded = encoder(encode)
            json+=`"${key}":${encoded},`
            // json+=`"${key}":${value.cache.get("serializer")(object[key])},` 
        });
        return json.slice(0, -1) + "}";
    }
    getValidator(schema: GenericSchema): (data: unknown, shallow?:boolean) => boolean {
        let validator = schema.cache.get("validator");
        if (!validator) {
            validator = this.validator.build(schema);
        }
        return validator;
    }

    buildObjectEncoder(schema: ObjectSchema): (data: unknown) => string {
        const objectEncoder = (data: unknown): string => {
            const isValid = validator(data, true)
            
            if (typeof data === "object" && !!data && isValid) {       
                let json = this.buildJson(data, schema);
                return json;
            } else {
                throw new ERR_INVALID_DATA()
            }
        };
        const validator = this.getValidator(schema);
        // Prebuild all encoders
        schema.properties.forEach((p) => {
            
            p.cache.set("serializer", this.build(p));
            
        });
        return objectEncoder;
    }
    buildBooleanEncoder(schema: BooleanSchema): (data: unknown) => string {
        function booleanEncoder(data: unknown) {
            if (typeof data === "boolean") {
                if (data) return "true";
                else return "false";
            } else {
                throw new ERR_INVALID_DATA();
            }
        }
        return booleanEncoder;
    }
    buildNumberEncoder(schema: NumberSchema): (data: unknown) => string {
        const numberEncoder = (data: unknown) => {
            if (validator(data)) {
                // Stringify is faster than any pure JS implementation for numbers
                return JSON.stringify(data);
            } else {
                throw new ERR_INVALID_DATA();
            }
        };
        const validator = this.getValidator(schema);
        return numberEncoder;
    }
    buildStringEncoder(schema: StringSchema): (data: unknown) => string {
        const stringEncoder = (data: unknown) => {
            if (validator(data)) {
                return `"${data}"`;
            } else {
                throw new ERR_INVALID_DATA();
            }
        };
        const validator = this.getValidator(schema);
        return stringEncoder;
    }
    // buildArrayEncoder(schema: Schema): (data: unknown) => string {
    //     const arrayEncoder = (data: unknown): string => {
    //         if (Array.isArray(data)) {
    //             if (validator(data) && typeof data === "object" && data) {
    //                 return "Sample Array"
    //             } else {
    //                 throw new ERR_MISMATCHED_DATA();
    //             }
    //         } else {
    //             throw new ERR_TYPE_MISMATCH();
    //         }
    //     };
    //     assertSchemaType(schema, "array");
    //     const validator = this.getValidator(schema);
    //     // Prebuild all encoders
    //     schema.properties.forEach((p) => {
            
    //         p.storage.set("serializer", this.build(p));
            
    //     });
    //     return arrayEncoder;
    // }
    /**
     * Build A JSON encoder with the provided schema
     */
    build(schema: GenericSchema) {
        let encoder;
        switch (schema.constructor) {
            case BooleanSchema:
                encoder = this.buildBooleanEncoder(schema as BooleanSchema);
                break;
            case NumberSchema:
                encoder = this.buildNumberEncoder(schema as NumberSchema);
                break;

            case ObjectSchema:
                encoder = this.buildObjectEncoder(schema as ObjectSchema);
                break;
            case StringSchema:
                encoder = this.buildStringEncoder(schema as StringSchema);
                break;
            default:
                throw new Error(`No encoder exists for type ${schema.constructor.name}`)
        }
        schema.cache.set("serializer", encoder);
        return encoder;
    }
}