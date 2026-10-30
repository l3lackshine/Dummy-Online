#!/bin/sh
# ทดสอบ schema.sql กับ Postgres ในเครื่อง: PGHOST/PGPORT/PGUSER ตั้งผ่าน env  ·  sh supabase/test/run.sh
set -e
D=$(dirname "$0"); DB=${DB:-dummy_test}
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -v ON_ERROR_STOP=1 -q -d $DB -f "$D/stub.sql"
psql -v ON_ERROR_STOP=1 -q -d $DB -f "$D/../name_filter.sql"
psql -v ON_ERROR_STOP=1 -q -d $DB -f "$D/../schema.sql"
psql -v ON_ERROR_STOP=1 -q -d $DB -f "$D/../schema.sql"   # รันซ้ำต้องไม่พัง
[ -f "$D/../seed_catalog.sql" ] && psql -v ON_ERROR_STOP=1 -q -d $DB -f "$D/../seed_catalog.sql"
psql -v ON_ERROR_STOP=1 -q -d $DB -f "$D/../v6_progression.sql"
psql -v ON_ERROR_STOP=1 -q -d $DB -f "$D/../v6_progression.sql"   # รันซ้ำต้องไม่พัง
psql -v ON_ERROR_STOP=1 -q -d $DB -f "$D/../bp_seed.sql"
psql -v ON_ERROR_STOP=1 -q -d $DB -f "$D/test.sql"
psql -v ON_ERROR_STOP=1 -q -d $DB -f "$D/test_v6.sql"
