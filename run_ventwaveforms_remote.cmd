@echo off
cd /d C:\Users\mailf\screening
"C:\Program Files\nodejs\node.exe" C:\Users\mailf\screening\screenPubMedCsv.mjs --input C:\Users\mailf\screening\ventwaveforms.csv --output C:\Users\mailf\screening\ventwaveforms.screened.full.csv --endpoint http://127.0.0.1:1234/v1/chat/completions > C:\Users\mailf\screening\ventwaveforms.run.log 2>&1
