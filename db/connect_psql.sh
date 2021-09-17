DIR=$(dirname $0)
. $DIR/.dev.env;
docker exec -it ts_clean_psql psql postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST/$POSTGRES_DB
