FROM node:carbon

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN export TZ=Europe/Moscow && npm test

ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]