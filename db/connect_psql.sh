DIR=$(dirname $0)
. $DIR/.dev.env;
docker exec -it postgres_db psql postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST/$POSTGRES_DB
