<h1 align="center">dearwebthree</h1>

A CLI tool to deploy web apps and save captured webpage to IPFS & Filecoin using [Web3.Storage](https://web3.storage) and [Moralis](https://moralis.io/)


### Installation
```
npm install dearwebthree -g
```

OR

```
yarn add global dearwebthree
```

Run `dearwebthree` or `dw3` in terminal for more information regarding how to use the CLI.

```html
$ dw3
Usage: dearwebthree [options] [command]

A CLI tool to deploy web apps and save captured webpage to IPFS & Filecoin using web3.storage and Moralis

Options:
  -v, --version              output the version number
  -h, --help                 display help for command

Commands:
  setup                      setup Web3.Storage and Moralis API Keys
  deploy [options]           deploy web app to Web3.Storage and Moralis
  capture [options] <url>    capture url single page webpage, screenshot and metadata to Web3.Storage and Moralis
  backup [options]           backup deployments and captures information
  init-action <type>         initialize deployment or capture github action
  deployments                display all your deployments
  captures                   display all your captures
  config-path                display config path
  help [command]             display help for command
```

### Github Actions Created and Used

1. [add-to-web3](https://github.com/pawanpaudel93/add-to-web3): Github Action forked from [add-to-web3](https://github.com/web3-storage/add-to-web3) to add Moralis support to deploy apps to IPFS & Filecoin.

	-  A demo project using add-to-web3 Github Action: [web3-action-deploy](https://github.com/pawanpaudel93/web3-action-deploy)

2. [w3name-action](https://github.com/pawanpaudel93/w3name-action): Github Action to Publish IPNS name using w3name service.

3. [web3-capture-action](https://github.com/pawanpaudel93/web3-capture-action): Github Action to capture single page html and screenshot of websites and save to Web3.Storage and Moralis.
	- A demo project using web3-capture-action to capture list of urls and save it to a JSON file: [web3-capture-cronjob](https://github.com/pawanpaudel93/web3-capture-cronjob)

### Usage
#### Setup

```html
Usage: dearwebthree setup [options]

setup Web3.Storage and Moralis API Keys

Options:
  -h, --help  display help for command
```
Run the following command and select service and provide API Key for the service.

```
dearwebthree setup
```

To display the path where `dearwebthree` config is save:
```
dearwebthree config-path
```

#### Deploy
> Currently supported are the applications using `React`, `Next`, `Vue`, `Nuxt`, `Svelte-Kit` and `Vite`.

##### Deployment Note
Use hash router for each of the above supported frameworks and libraries for better routing support. For Next.js there is no hash router, so use `trailingSlash: true` in nextConfig for better routing support so that routes can also be accessed on reload too.


```html
Usage: dearwebthree deploy [options]

deploy web app to Web3.Storage and Moralis

Options:
  -n, --no-build           deploy without building the app if it is already build
  -s, --service <service>  select service (choices: "web3.storage", "moralis", default: "web3.storage")
  -h, --help               display help for command

```

Run this command in the app folder to deploy the app to Web3.Storage or use service option to select the service you are deploying to.

```
dearwebthree deploy
```
Or with desired service,
```
dearwebthree deploy -s moralis
```

If you already build the project already and don't want cli to build again then run the command below:
```
dearwebthree deploy --no-build
```

To display all the deployments made:
```
dearwebthree deployments
```

#### Capture

```html
Usage: dearwebthree capture [options] <url>

capture url single page webpage, screenshot and metadata to Web3.Storage and Moralis

Arguments:
  url                      capture url to Web3.Storage or Moralis

Options:
  -s, --service <service>  select service (choices: "web3.storage", "moralis", default: "web3.storage")
  -h, --help               display help for command

```

Run this command to save single page html and screenshot for the given url with default service as web3.storage. Use service option for selecting desired ones.

```
dearwebthree capture https://web3.storage
```
Or with desired service,
```
dearwebthree capture https://web3.storage -s moralis
```

To display all the captures made:
```
dearwebthree captures
```

#### Github Actions for Deployment and Capture

```html
Usage: dearwebthree init-action [options] <type>

initialize deployment or capture github action

Arguments:
  type        type of github action to initialize (choices: "capture", "deployment")

Options:
  -h, --help  display help for command

```

Run the following commands to initialize capture and deplyment github actions for your project.
For deployment:
```
dearwebthree init-action deployment
```
For capture:
```
dearwebthree init-action capture
```

## Author

👤 **Pawan Paudel**

- Github: [@pawanpaudel93](https://github.com/pawanpaudel93)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/pawanpaudel93/dearwebthree/issues).

## Show your support

Give a ⭐️ if this project helped you!

Copyright © 2022 [Pawan Paudel](https://github.com/pawanpaudel93).<br />
