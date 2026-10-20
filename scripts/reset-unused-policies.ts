import {readFile} from "node:fs/promises";
import {parseArgs,parseEnv} from "node:util";
import mysql from "mysql2/promise";
import {resetUnusedPolicies} from "../server/requirements/policy-reset.js";
import {AuthError} from "../server/auth/service.js";

// No HTTP endpoint or runtime DELETE grant. Explicit files and production guard only.
try{
 const {values}=parseArgs({options:{manifest:{type:"string"},env:{type:"string"},execute:{type:"boolean"}}});
 if(!values.execute||!values.manifest||!values.env)throw Error("Use --execute --manifest PATH --env PRODUCTION_ENV_PATH; backup and reviewed manifest required.");
 const env=parseEnv(await readFile(values.env,"utf8"));
 if(env.APP_ENV!=="production"||env.DB_NAME!=="ldss_scholar_monitor_production"||env.DB_HOST!=="127.0.0.1")throw Error("Unexpected maintenance target");
 const input=JSON.parse(await readFile(values.manifest,"utf8"));
 if(input.database!==env.DB_NAME)throw Error("Manifest target mismatch");
 const local=parseEnv(await readFile(".env","utf8"));
 const db=await mysql.createConnection({host:env.DB_HOST,port:Number(env.DB_PORT),user:"root",password:local.LDSS_SETUP_ADMIN_PASSWORD, database:env.DB_NAME,timezone:"Z",dateStrings:true});
 try{console.log(JSON.stringify(await resetUnusedPolicies(db,input)));}finally{await db.end();}
}catch(e){console.error(e instanceof AuthError ? `${e.code}: ${e.message}` : "Policy reset failed; inspect private evidence. No automatic retry.");process.exitCode=1;}
