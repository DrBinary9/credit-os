FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on (matches the port in app.js or env)
EXPOSE 3000

# Specify the command to run your app
CMD ["npm", "start"]
