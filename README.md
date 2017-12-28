# Mutant
Productivity launcher

## What is this?
This is a productivity app inspired by the great qdore's [mutate](https://github.com/qdore/Mutate) launcher (hence the name), which is inspired by Alfred Launcher.
It is intended to substitute the default search bar adding more features and usability, making the workflow easy.

## How to use it
Install and launch, default launch shortcut is Ctrl+Space, but it's overridable.

Get in the project dir

`cd mutant`

Make installer executable

`chmod a+x install.sh`

Launch installer

`sudo ./install.sh`

Install modules

`sudo npm install`

Launch app

`electron .`

## Current Features
* Search and launch any installed app
* Search on the internet (defaults to google)
* Search on browser history (working on it, by now only firefox and chrome are supported)
* Launch given url

## Contributing
Any contribution is welcome, don't hesitate to make a pull request.
My front-end skill-set is poor, any support there would be much appreciated.

* Developing applications:
  There's no guide for this right now, but it's fairly simple, grabbing any application and looking at the code should give a good overview.

## Motivation
After using qdore's mutate for almost a year and customizing it a lot I miss some functionality so I decided to make my own version of it.

## Dependencies
* nodejs
* electron (atom shell)
* pkg-config
* gtk+-3.0
* librsvg2-dev

## Roadmap
* ~~Install script (by now just set things up)~~
* ~~Settings window~~ (Shortcut override)
* Use and launch custom scripts (search on given scripts folder)
* ~~Search on more browsers history~~ (By now support for Chrome and Firefox)
* Dictionary
* ~~Calculator~~
* Translator
* Maps??
* Web preview (Apple's spotlight style)

## Notes
One of the problems of mutate is theme detection (used for icon selection), which is a fail of gtk lib, here I solved it passing the name of the current theme by parameter. In a near future there shold be a script for detecting theme (which depends on the distro)

Installer script was taken partially from [node-tensorflow](https://github.com/node-tensorflow/node-tensorflow)
