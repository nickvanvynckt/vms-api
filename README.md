# Virtual Meeting Secretary - API

The accompanying client can be found [here](https://github.com/JorisPalings/vms).

## Installation

### Prerequisites
To install and run this project, you'll need to have [Node.js with npm](https://nodejs.org/en/) and [Git](https://git-scm.com/downloads) installed on your machine.

### Windows
```
:: Run the MongoDB daemon in the background
START "" mongod

:: Clone the files from the GitHub repository
git clone https://github.com/nickvanvynckt/vms-api.git

:: Enter the project folder
cd vms-api

:: Install the project's dependencies
npm install

:: Run the server in the background
START "" nodemon

:: Open the API explorer in the browser
START http://localhost:4000/explorer
```

### Linux/OSX
```
# Run the MongoDB daemon in the background
mongod &

# Clone the files from the GitHub repository
git clone https://github.com/nickvanvynckt/vms-api.git

# Enter the project folder
cd vms-api

# Install the project's dependencies
npm install

# Run the server in the background
nodemon &

# Open the API explorer in the browser
open http://localhost:4000/explorer
```
