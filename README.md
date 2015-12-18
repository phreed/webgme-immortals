
The plugins were created using
https://github.com/webgme/webgme-setup-tool

But first the Node.js development environment needs to be established.
https://github.com/creationix/nvm
This gives us 'nvm'.

    nvm use system
    nvm list

    nvm install 5.2.0
    nvm use 5.2.0

make sure we are up to date.
    npm install -g npm

Now we can get the webgme-setup-tool
    npm install -g webgme-setup-tool

Now we can make a webgme project using the setupt tool
    webgme init webgme-tinkerpop3
    cd webgme-tinkerpop3/

Let us make sure everything is in working order.
    webgme start

Ctrl-C to shut the server down.
You will do this each time you make significant changes to your project.
What is a significant change?
Probably better to consider insignificant, i.e. changes to javascript or css.
These insignificant changes only require a save and a reload in the browser.

This sytem will have plugins, addons and visualizers.
First order of business is getting the 'checkout' and 'checkin' plugins working.
    webgme new plugin -h

The --config-structure allows the operator to change configuration variables.
In this case the graph multi-model host and the query to run.
    webgme new plugin --config-structure checkout
    webgme new plugin --config-structure checkin

Now enable the plugins for the paradigm.
    webgme enable plugin checkin feature_model
    webgme enable plugin checkout feature_model

We want a seed model so that the checkout can be run.
    webgme new seed baz --seed-name immortals

Eventually we will want to visualize the graph more conventionally:
    webgme new viz  cytoscape

And we will want to use addons to prevent the model from being damaged
too severely while it is being worked on. Basically this means that
some nodes cannot be deleted or anything that changes their uuids.
    webgme new addon  preserve
