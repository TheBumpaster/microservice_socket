from node:14-alpine

# Confirm working directory

USER node

RUN mkdir /home/node/.npm-global ; \
    mkdir -p /home/node/app ; \
    chown -R node:node /home/node/app ; \
    chown -R node:node /home/node/.npm-global

ENV PATH=/home/node/.npm-global/bin:$PATH
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

WORKDIR /home/node/app

# Install app dependencies
COPY package.json /home/node/app
COPY package-lock.json /home/node/app

ENV NPM_CONFIG_LOGLEVEL error

RUN npm ci

ENV DOCKER=TRUE

# Bundle APP files
COPY . /home/node/app

USER $USER
RUN npm run build

ARG NODE
ENV NODE_ENV ${NODE}
ARG PORT

# Make port from arguments available to the world outside this container
EXPOSE $PORT

CMD [ "npm", "run", "start" ]