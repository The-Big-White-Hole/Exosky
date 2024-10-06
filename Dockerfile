FROM node:22-bookworm

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY package.json /usr/src/app/
WORKDIR /usr/src/app/
RUN pnpm install


COPY . /usr/src/app/
RUN pnpm run build
