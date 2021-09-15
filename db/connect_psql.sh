DIR=$(dirname $0)
. $DIR/.dev.env;
docker exec -it ts_clean_psql_test psql postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_TEST_HOST/$POSTGRES_DB
