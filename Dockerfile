from node:8-alpine

# Set the working directory
WORKDIR /usr/src/app

# Set an entrypoint, to automatically install node modules
ENTRYPOINT ["/bin/sh", "-c", "if [[ ! -d node_modules ]]; then npm install; fi; exec \"${@:0}\";"]
CMD ["node", "app.js"]

# First, install dependencies to improve layer caching
COPY package.json /usr/src/app/
RUN apk add make gcc g++ python && \
  npm install 

# Add the code
COPY . /usr/src/app
