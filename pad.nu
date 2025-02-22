let db = $env.DATABASE_URL
def sql [query: string] {
    psql $db --csv -c $query | from csv
}
###

sql "select * from memories"

sql "SELECT * FROM pg_extension;"
