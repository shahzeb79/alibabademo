FROM mhart/alpine-node:7
RUN apk add --update git

WORKDIR /app

COPY package.json .
COPY .npmrc .npmrc
COPY gruntfile.js .

RUN npm install
RUN npm run postinstall

COPY src src
COPY specs specs
COPY mocks mocks
COPY demo demo
COPY .npmrc .npmrc
COPY .vscode .vscode

CMD [ "npm", "run", "dev" ]
