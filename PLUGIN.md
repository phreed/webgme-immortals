
### PLUGIN Usage

#### The PUSH Plugin

The push plugin can be used to produce either:
  # the Json form for import into the knowledge-data-store (kds).
  # the Json form for loading into Cytoscape.


#### The PULL Plugin

The pull plugin is not developed but it will read
files from the knowledge-data-store into a new
webGME project.


### PLUGIN Creation ###

The plugins were created using
https://github.com/webgme/webgme-setup-tool

Now we can make a webgme project using the setup tool
    webgme init webgme-immortals
    cd webgme-immortals/

This sytem will have plugins, addons and visualizers.
First order of business is getting the 'pull' and 'push' plugins working.
    webgme new plugin -h

The --config-structure allows the operator to change configuration variables.
In this case the graph multi-model host and the query to run.
    webgme new plugin --config-structure pull
    webgme new plugin --config-structure push

Now enable the plugins for the paradigm.
    webgme enable plugin push feature_model
    webgme enable plugin pull feature_model

We want a seed model so that the pull can be run.
    webgme new seed baz --seed-name immortals

Eventually we will want to visualize the graph more conventionally:
    webgme new viz  cytoscape

And we will want to use addons to prevent the model from being damaged
too severely while it is being worked on. Basically this means that
some nodes cannot be deleted or anything that changes their uuids.
    webgme new addon  preserve
