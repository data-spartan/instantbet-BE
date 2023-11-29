# InstantBet BE

This README is general overview of whole app including all related microservices.
In near future all microservice projects will have their own specific README. 
Right now instantbet-data-hub microservice contains general overview of whole BE App. 

Microservices available at the momment:
1. https://github.com/data-spartan/instantbet-ws-scraper
2. https://github.com/data-spartan/instantbet-account
3. https://github.com/data-spartan/instantbet-data-hub

#### ABOUT:
InstantBet is a nodejs backend app for a real-time sports betting(e.g BWIN), made with Nestjs.

### Features Overview:

- Websockets enables real-time sports betting - **in progress**
- Kafka enables scalable, failsafe and extremely fast data exchange between services
- Dead letter queue(Kafka) for extremely sensitive failed data actions(payments, resolving markets ...) - **in progress**
- Mongodb enables seamless and fast storage of nested JSON betting data such as macthes, markets and statistics.
- RBAC based Authorization and Authentication with rotating refresh token, ES256 token signing algorithm with pub/priv keys and email verification using Postgres DB
- Redis cache username, refresh tokens for Auth service - **in progress**
- Placing bets and Payment service using Stripe and Postgres DB - **in progress**
- Redis Pub/Sub enables notification to web-socket-live-feed of newly/updated arrived live betting data and emitting to all subscribed clients - **in progress**
- Notification service consisting of phone and email notifications using Twilio and Nodemailer respectively - **in progress**
- Slack integration for error notifications - **in progress**

### Architecture diagram:


## Installation:
Steps and commands will variate between microservices.This is only general overview.

### Step 1

Clone the repository from GitHub(): https://github.com/data-spartan/instantbet-data-hub
You will need node v18.18.0, npm, @nestjs/cli, docker and docker-compose installed on your machine.

All commands should be run inside of the container which can be accessed by running ./bin/container from the root

### Step 2

When inside the container, run the following npm commands:

to create a database

`$ npm db:create`

run migrations:

`$ npm db:migrate`

run seeders:

`$ npm db:seed`

### Step 3

The web app should be available at localhost:3000

## Testing
- **in progress**

## Deployment
- **in progress**

## Naming conventions

Branches should be named as following: feature/IB-DH-14-implements-readme, in this example IB-DH stands for InstantBet(app name) and DH is DataHub(service name), 14 is the number of the ticket on Trello and after that is a short description. Commit messages should this format: feat/[IB-DH-14] Implements README.md file.