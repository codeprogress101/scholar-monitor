/** Isolated DB-COMPAT-1 connector proposal. No automatic primary activation. */
import assert from 'node:assert/strict';
import mysql from 'mysql2';
import promiseMysql from 'mysql2/promise';
const port=Number(process.env.LDSS_DB_COMPAT_PORT);
assert.ok([3337,3338].includes(port),'Explicit isolated target port required');
for(const api of [mysql,promiseMysql])for(const name of ['createPool','createConnection']){
 const original=api[name].bind(api);
 api[name]=(options,...rest)=>original(options&&typeof options==='object'&&Number(options.port)===port?{...options,jsonStrings:true}:options,...rest);
}
