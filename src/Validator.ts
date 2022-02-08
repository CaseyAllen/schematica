import { defaultStringSchema, Schema as SchemaT } from "./types/schemas";
import ERR_INVALID_RANGE from "./errors/schema/ERR_INVALID_RANGE";
import ERR_TYPE_MISMATCH from "./errors/schema/ERR_TYPE_MISMATCH";
import checkStringEncoding from "./util/checkStringEncoding";
import rfdc from "rfdc"
import Schema from "./Schema";

class ValidatorBuilder{
    buildStringValidator(_schema:Schema) {
        let schema = _schema.schema
        
        // Use the defaults, and overwrite with the provided values
        // FIXME: Speed this up, may be a bottleneck in the futur  
        schema =  Object.assign(rfdc({proto:true})(defaultStringSchema), schema)
        
        if (schema.type === "string") {
                
            function stringValidator(data: unknown) {               
                if(schema.type==="string"&&typeof data === "string"){
                    if(schema.trim){
                        data = data.trim()
                    }
                    if(typeof data==="string"&&schema.encoding){
                        if(!checkStringEncoding(data, schema.encoding)){
                            return false
                        }                     
                    }
                    if(
                        typeof data==="string"&&
                        (schema.maxLength
                            ? data.length <= schema.maxLength
                            : true) && (schema.minLength
                            ? data.length >= schema.minLength
                            : true)
                    ){
                        // Run the Regex last because it is expensive
                        if(schema.match&&typeof data==="string"){
                            
                            if(schema.match.test(data)){
                                
                                return true
                            }
                            else{
                                return false
                            }
                        }
                        return true
                    }
                    else{
                        return false
                    }

                }
                else{
                    return false
                }
            }
            
            return stringValidator
        } else {
            // This shouldnt ever run, but just to be safe     
              
            throw new ERR_TYPE_MISMATCH();
        }
        

        
    }
    buildArrayValidator(_schema:Schema) {
        const schema = _schema.schema

        function arrayValidator(data:unknown){
            return true
        }
        return arrayValidator
    }
    buildNumberValidator(_schema:Schema) {
        const schema = _schema.schema
        
        if (schema.type === "number") {
            
            if (schema.max && schema.min && !(schema.max - schema.min >= 0)) {
                // Invalid range was provided, i.e min greater than max
                throw new ERR_INVALID_RANGE();
            }
            function numberValidator(data: unknown) {
                if (
                    schema.type == "number" &&
                    typeof data === "number" &&
                    (schema.max
                        ? data <= schema.max
                        : true && schema.min
                        ? data >= schema.min
                        : true)
                ) {
                    return true;
                } else {
                    return false;
                }
            }
            
            return numberValidator;
        } else {
            // This shouldnt ever run, but just to be safe     
              
            throw new ERR_TYPE_MISMATCH();
        }
    }
    buildObjectValidator(_schema:Schema){
        const schema = _schema.schema
        // Build all the child validators and add them to an object
        const validators: { [key: string]: Function } = {};
        
        if (schema.type === "object") {
            
            for (let [name, schemaProperties] of Object.entries(schema.properties)) {
                
                const sch = new Schema(schemaProperties)
                
                
                validators[name] = this.build(sch);
                
            }
        } else {
            // This should never actually run, but better to be safe than sorry     
            throw new ERR_TYPE_MISMATCH();
        }
        function objectValidator(data: unknown) {
            
            if (data && typeof data === "object" && schema.type === "object") {
                const schemaKeys = Object.keys(schema.properties);
                if(schema.required && (Object.keys(data).length < schema.required.length)){
                    return false
                }
                for (let [key, value] of Object.entries(data)) {

                    if (schemaKeys.includes(key)) {
                        const validator = validators[key];
                        if (!validator) {
                            throw new Error(
                                "Validators were not properly built"
                            );
                        }
                        if (!validator(value)) {
                            return false;
                        }
                    } else {
                        // The key is excess
                        // Return false if additional Properties are not allowed
                        if (!schema.additionalProperties) {
                            return false;
                        }
                    }
                }
                return true;
            } else {
                return false;
            }
            return false;
        }
        
        return objectValidator;
    }
    buildBooleanValidator(_schema:Schema) {
        const schema = _schema.schema
        function booleanValidator(data: unknown) {
            if (typeof data === 'boolean' &&schema.type === "boolean") {
                return true;
            } else {
                return false;
            }
        }
        return booleanValidator
    }

    build(schema:Schema):(data:unknown)=>boolean{
        
        let validator;
        
        switch(schema.schema.type){
            case "array":
                validator = this.buildArrayValidator(schema);
                break;
            case "boolean":
                validator = this.buildBooleanValidator(schema);
                break;
            case "number":
                validator = this.buildNumberValidator(schema);
                break;
            case "object":
                validator = this.buildObjectValidator(schema);
                break;
            case "string":
                validator = this.buildStringValidator(schema);
                break;
            default:
                throw new Error("Invalid Schema Type")
            
        }
        schema.storage.set("validator", validator)
        return validator
    }
}
const kBuilder = Symbol("Validator Builder")
export default class Validator {
    [kBuilder]:ValidatorBuilder
    constructor() {
        this[kBuilder] = new ValidatorBuilder()
    }

    build(schema:Schema){
        return this[kBuilder].build(schema)
    }
}
