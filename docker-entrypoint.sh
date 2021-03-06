#!/bin/bash
set -e

worker() {
  HOST=${HOST:-"0.0.0.0"}
  PORT=${PORT:-3001}

  echo "Starting worker"
  exec node /usr/src/app/worker.js
}

app() {
  HOST=${HOST:-"0.0.0.0"}
  PORT=${PORT:-3000}

  echo "Starting app"
  exec node /usr/src/app/app.js
}

reciever() {
  HOST=${HOST:-"0.0.0.0"}
  PORT=${PORT:-3002}

  echo "Starting app"
  exec node /usr/src/app/reciever.js
}

test() {
  RUN=${RUN:-"false"}

  echo "Starting tests"
  cd /usr/src/app/ && exec npm test
}


help() {
  echo "Sequence Docker"
  echo ""
  echo "Usage:"
  echo ""

  echo "app -- start application"
  echo "worker -- start workers for tasks"
  echo "reciever -- recieve events"
  echo "test -- exec tests"
  echo ""
  echo "shell -- open shell"
}

case "$1" in
  worker)
    shift
    worker
    ;;
  app)
    shift
    app
    ;;
  reciever)
    shift
    reciever
    ;;
  test)
    shift
    test
    ;;
  shell)
    exec /bin/bash
    ;;
  help)
    shift
    help
    ;;
  *)
    exec "$@"
    ;;
esac