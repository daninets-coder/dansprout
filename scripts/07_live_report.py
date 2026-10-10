"""Read-only report from the LIVE database: story library status and recent errors. Changes nothing.
Needs the Railway command line logged in (railway login). Run: python scripts/07_live_report.py"""
import base64
import sys
from common import RAILWAY_SERVICE, bad, run, step

JS = (
    "const {Pool}=require('pg');"
    "const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('railway.internal')?false:{rejectUnauthorized:false}});"
    "(async()=>{"
    "const q=async(t,s)=>{const r=await p.query(s);console.log(t+': '+JSON.stringify(r.rows))};"
    "await q('Library stories by status','SELECT status,COUNT(*)::int n FROM library_stories GROUP BY 1');"
    "await q('Accounts','SELECT COUNT(*)::int n FROM accounts');"
    "await q('Stories last 7 days by type','SELECT created_by,COUNT(*)::int n FROM stories WHERE created_at>NOW()-INTERVAL \\'7 days\\' GROUP BY 1');"
    "await q('AI cost by model (USD)','SELECT model,ROUND(SUM(estimated_cost_usd)::numeric,2) usd FROM ai_invocations GROUP BY 1 ORDER BY usd DESC NULLS LAST');"
    "await p.end()})().catch(e=>{console.log('ERROR '+e.message);process.exit(1)})"
)

step("Live report (read-only)")
encoded = base64.b64encode(JS.encode()).decode()  # avoids shell-quoting problems
result = run(["railway", "ssh", "--service", RAILWAY_SERVICE, "--", f"cd /app && echo {encoded} | base64 -d | node"], capture=True)
lines = [l for l in result.stdout.splitlines() if ": [" in l or l.startswith("ERROR")]
if not lines:
    bad("no data came back. Are you logged in? Try: railway login   (then run this again)")
    print(result.stderr[-500:])
    sys.exit(1)
print("\n".join(lines))
