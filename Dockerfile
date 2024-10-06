# it's a good idea to pin this, but for demo purposes we'll leave it as is
FROM node:22-bookworm AS builder

# automatically creates the dir and sets it as the current working dir
WORKDIR /usr/src/app

# this will allow us to run vite and other tools directly
ENV PATH /usr/src/node_modules/.bin:$PATH

# expose the variable to the finished cotainer
ENV NODE_ENV="production"

COPY package.json ./
COPY yarn.lock ./


RUN yarn install

# use a more specific COPY, as this will include files like `Dockerfile`, we don't really need inside our containers.
COPY . ./

CMD ["yarn", "build"]