
import requests
import json
from py2cytoscape.data.cyrest_client import CyRestClient
import base64
import sys, binascii
import pylab
import networkx as nx
#from networkx.readwrite import json_graph
from py2cytoscape import util as cy 
#from requests_toolbelt.multipart.encoder import MultipartEncoder

# function to filter data from json obj
def filterContainmentData (obj, nodeName):
  nodes = obj["elements"]["nodes"]
  edges = obj["elements"]["edges"]
  nodeId = ""
  # get id of target node
  for i in nodes:
    if "name" in i["data"] and i["data"]["name"] == nodeName:
      nodeId = i["data"]["id"]
      node = i
      break
  if not nodeId:
    return {}

  # add nodes and edges contained in target node to lists
  childrenEdges = []
  childrenNodeIds = []
  for i in edges:
    if i["data"]["type"] == "is-contained-in" and i["data"]["target"] == nodeId:
      childrenEdges.append(i)
      childrenNodeIds.append(i["data"]["source"])

  if not childrenEdges:
    return {}

  childrenNodes = [node]
  # loop again to find source nodes
  for i in nodes:
    if i["data"]["id"] in childrenNodeIds:
      childrenNodes.append(i)


  obj["elements"]["nodes"] = childrenNodes
  obj["elements"]["edges"] = childrenEdges

  return json.dumps(obj)





# and the type of relationship (Connection, Containment) to change the line type
style_name = 'My Visual Style'
my_style = {
  "title" : style_name,
  "defaults" : [ {
    "visualProperty" : "EDGE_WIDTH",
    "value" : 1.0
  }, {
    "visualProperty" : "EDGE_CURVED",
    "value" : "True"
  }, {
    "visualProperty":"NODE_WIDTH",
    "value": 100
  }, 
  {
    "visualProperty" : "NODE_FILL_COLOR",
    "value" : "#00ddee"
  },{
    "visualProperty" : "NODE_BORDER_WIDTH",
    "value" : 1
  }, {
    "visualProperty" : "EDGE_TRANSPARENCY",
    "value" : 400
  },{
    "visualProperty" : "EDGE_TARGET_ARROW_SHAPE",
    "value" : "DELTA"
  },{
    "visualProperty" : "NODE_SHAPE",
    "value" : "RECTANGLE"
  }],
  "mappings" : [ 
  # {
  #   "mappingType" : "discrete",
  #   "mappingColumn" : "entityClass",
  #   "mappingColumnType" : "String",
  #   "visualProperty" : "NODE_FILL_COLOR",
  #   "map" : [ {
  #     "key" : "Set",
  #     "value" : "#FDAE61"
  #   }, {
  #     "key" : "Folder",
  #     "value" : "#D7191C"
  #   } , {
  #     "key" : "Model",
  #     "value" : "#2C7BB6"
  #   }, {
  #     "key" : "Atom",
  #     "value" : "#ABD9E9"
  #   }, {
  #     "key" : "Ref",
  #     "value" : "#636363"
  #   }]
  # }, 
  {
    "mappingType" : "discrete",
    "mappingColumn" : "type",
    "mappingColumnType" : "String",
    "visualProperty" : "EDGE_STROKE_UNSELECTED_PAINT",
    "map" : [ {
      "key" : "is-based-on",
      "value" : "RED"
    }, {
      "key" : "is-contained-in",
      "value" : "BLUE"
    } ]
  },{
    "mappingType" : "discrete",
    "mappingColumn" : "type",
    "mappingColumnType" : "String",
    "visualProperty" : "EDGE_LINE_TYPE",
    "map" : [ {
      "key" : "is-contained-in",
      "value" : "SOLID"
    }, {
      "key" : "is-based-on",
      "value" : "DOT"
    }
    ]
  } ,            
   {
    "mappingType" : "passthrough",
    "mappingColumn" : "name",
    "mappingColumnType" : "String",
    "visualProperty" : "NODE_LABEL"
  }
  ]
}


# load json file
data = json.loads(open('immortals_deployment_model.cyjs').read())
data = filterContainmentData(data, "SpecifiedNetworkTopology")

# Basic cyRest Setup                                                                                                                                                                                                                  
PORT_NUMBER = 1234
BASE = 'http://localhost:' + str(PORT_NUMBER) + '/v1/'

# Header for posting data to the server as JSON                                                                                                                                                                                       
HEADERS = {'Content-Type': 'application/json'}

# layout can be any of the "attribute-circle","allegro-weak-clustering","allegro-edge-repulsive-fruchterman-reingold","stacked-node-layout","allegro-edge-repulsive-strong-clustering","allegro-strong-clustering","degree-circle","allegro-fruchterman-reingold","allegro-edge-repulsive-spring-electric","circular","attributes-layout","kamada-kawai","force-directed","allegro-edge-repulsive-weak-clustering","grid","hierarchical","allegro-spring-electric",
layout= "hierarchical"

#res = requests.post(BASE + 'networks', data=open('immortals_deployment_model.cyjs', 'rb'), headers=HEADERS)
#res = requests.post(BASE + 'networks', data=json.dumps(cy.from_networkx(G)), headers=HEADERS) 
res = requests.post(BASE + 'networks', data=data, headers=HEADERS)

# applying the layout defined above to the network 
requests.get(BASE+ 'apply/layouts/'+layout+'/'+str(res.json()['networkSUID']))


new_network_id = res.json()['networkSUID']
print('Network created: SUID = ' + str(new_network_id))

# clearing other visual styles
requests.delete(BASE + "styles")

# apply new visual style
res1 = requests.post(BASE + "styles", data=json.dumps(my_style), headers=HEADERS)
new_style_name = res1.json()['title']

# Apply it to current netwrok
requests.get(BASE + 'apply/styles/' + new_style_name + '/' + str(res.json()['networkSUID']))

# data_str = ''
# n = 0
# while n <100:
#     data_str = data_str + str(n) + '\t' + str(n+1) + '\n'
#     n = n + 1

# # Join the first and last nodes
# data_str = data_str + '100\t0\n'

# print(data_str)

# You can create multiple networks by running simple for loop:
# for i in range(5):
#     res = requests.post(BASE + 'networks?format=edgelist&collection=Ring', data=data_str, headers=HEADERS)
#     circle_suid = res.json()['networkSUID']
#     requests.get(BASE + 'apply/layouts/circular/' + str(circle_suid))

# Image(url=BASE+'networks/' + str(circle_suid) + '/views/first.png', embed=True)

# # Add a new nodes to existing network (with time stamps)
# import datetime

# new_nodes =[
#     'Node created at ' + str(datetime.datetime.now()),
#     'Node created at ' + str(datetime.datetime.now())
# ]

# res = requests.post(get_nodes_url, data=json.dumps(new_nodes), headers=HEADERS)
# new_node_ids = res.json()
# pp(new_node_ids)


