import {ApiError} from './auth-api';
export function definitiveDocumentConflict(error:unknown,path:string){
 return /^individual-payments\/transactions\/[a-f\d-]+\/documents\/generate$/.test(path)&&error instanceof ApiError&&error.status===409&&['DOCUMENT_SOURCE_CHANGED','DOCUMENT_CHANGED','DOCUMENT_TEMPLATE_CHANGED','DOCUMENT_TEMPLATE_UNAVAILABLE','DOCUMENT_UNAVAILABLE'].includes(error.code);
}
