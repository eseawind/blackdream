define(
    ["business/module", "business/api"],
    function (module) {
        "use strict";

        module.controller("templateStrategyUpdateController", [
            "$scope", "$routeParams", "location", "templateStrategyApi", "templateApi", "viewPage",
            function($scope, $routeParams, location, templateStrategyApi, templateApi, viewPage){
                viewPage.setViewPageTitle("生成策略修改");
                $scope.updateRequest = {};

                var id = $routeParams.id;
                templateStrategyApi.get({id: id}).success(function(templateStrategy){
                    angular.extend($scope.updateRequest, templateStrategy);

                    templateApi.query({generatorId: templateStrategy.generator.id}).success(function(templates){
                        $scope.templates = templates;
                    });
                });

                $scope.formatTag = function(tag){
                    if(tag.tagName == "File"){
                        tag.$closed = true;
                        if(tag.template && angular.isObject(tag.template)) {
                            tag.template = tag.template.id;
                        }
                    }
                    else if(tag.tagName == "Call" || tag.tagName == "Function"){
                        var argumentList = tag.arguments;
                        if(argumentList){
                            for(var i = 1 ; i <= argumentList.length ; i++){
                                tag["argument" + i] = argumentList[i-1];
                            }
                        }
                        delete tag.arguments;
                    }
                };

                $scope.add = function(tagName, parent){
                    if(!parent.children) {
                        parent.children = [];
                    }
                    parent.children.push({tagName: tagName});
                    $scope.templateStrategyUpdateForm.$setDirty();
                };

                $scope.delete = function(child, parent){
                    for(var i = 0 ; i < parent.children.length ; i++){
                        if(child == parent.children[i]){
                            parent.children.splice(i, 1);
                            $scope.templateStrategyUpdateForm.$setDirty();
                            return;
                        }
                    }
                };

                $scope.sortableOptions = {
                    update: function(e, ui) {
                        $scope.templateStrategyUpdateForm.$setDirty();
                    },
                    stop: function(e, ui) {

                    }
                };

                $scope.getMessage = function(field, $error, validateMessages){
                    for(var k in $error) {
                        var rule = validateMessages[field][k];
                        return rule ? rule.message : null;
                    }
                };

                $scope.tagRules = {
                    Break:{
                        children:[],
                        attributes:{}
                    },
                    Call:{
                        children:[],
                        attributes: {
                            "function":{size:20,required:{rule:true,message:"必输项"},placeholder:"函数名"},
                            argument1:{size:20,placeholder:"实参1"},
                            argument2:{size:20,placeholder:"实参2"},
                            argument3:{size:20,placeholder:"实参3"},
                            argument4:{size:20,placeholder:"实参4"}
                        }
                    },
                    Continue:{
                        children:[],
                        attributes:{}
                    },
                    File:{
                        children:["TemplateContext"],
                        attributes:{
                            name:{size:100,required:{rule:true,message:"必输项"},placeholder:"文件名（可含文件夹目录）"},
                            template:{required:{rule:true,message:"必输项"},placeholder:"模板"}
                        }
                    },
                    Folder:{
                        children:[],
                        attributes:{
                            name:{size:100,required:{rule:true,message:"必输项"},placeholder:"文件夹目录"}
                        }
                    },
                    Foreach:{
                        children:["Break","Call","Continue","File","Folder","Foreach","Function","If","Return","Set","Var"],
                        attributes:{
                            item:{required:{rule:true,message:"必输项"},size:20,placeholder:"迭代变量"},
                            items:{required:{rule:true,message:"必输项"},size:50,placeholder:"迭代集合"},
                            status:{size:20}
                        }
                    },
                    Function:{
                        children:["Call","File","Folder","Foreach","Function","If","Return","Set","Var"],
                        attributes:{
                            name:{required:{rule:true,message:"必输项"},placeholder:"函数名"},
                            argument1:{size:20,placeholder:"形参1"},
                            argument2:{size:20,placeholder:"形参2"},
                            argument3:{size:20,placeholder:"形参3"},
                            argument4:{size:20,placeholder:"形参4"}
                        }
                    },
                    If:{
                        children:["Break","Call","Continue","File","Folder","Foreach","Function","If","Return","Set","Var"],
                        attributes:{
                            test:{required:{rule:true,message:"必输项"},size:50,placeholder:"判断条件"}
                        }
                    },
                    Return:{
                        children:[],
                        attributes:{}
                    },
                    Set:{
                        children:[],
                        attributes:{
                            "var":{required:{rule:true,message:"必输项"},size:20,placeholder:"变量名"},
                            value:{required:{rule:true,message:"必输项"},size:50,placeholder:"变量值"}
                        }
                    },
                    TemplateContext:{
                        children:[],
                        attributes:{
                            "var":{required:{rule:true,message:"必输项"},size:20,placeholder:"变量名"},
                            value:{required:{rule:true,message:"必输项"},size:50,placeholder:"变量值"}
                        }
                    },
                    TemplateStrategy:{
                        children:["Call","File","Folder","Foreach","Function","If","Set","Var"],
                        attributes:{
                            name:{required:{rule:true,message:"必输项"},maxlength:{rule:20,message:"最长20位"},placeholder:"名称"}
                        }
                    },
                    Var:{
                        children:[],
                        attributes:{
                            name:{required:{rule:true,message:"必输项"},size:20,placeholder:"变量名"},
                            value:{required:{rule:true,message:"必输项"},size:50,placeholder:"变量值"}
                        }
                    }
                };

                $scope.hashKey = function(entity){
                    return entity.$$hashKey.split(":")[1];
                };

                $scope.update = function(){
                    templateStrategyApi.update($scope.updateRequest).success(function(){
                        location.go("/business/templateStrategy/manage/" + $scope.updateRequest.generator.id);
                    });
                };

                $scope.copy = function(node){
                    $scope.copyNode = node;
                };

                $scope.canCopy = function(node){
                    if(!$scope.copyNode){
                        return false;
                    }
                    var children = $scope.tagRules[node.tagName].children;
                    if(!children || !children.length){
                        return false;
                    }
                    for(var i = 0 ; i < children.length ; i++){
                        if(children[i] == $scope.copyNode.tagName){
                            return true;
                        }
                    }
                    return false;
                };

                var copyNode = function(sourceNode, targetNode){
                    for(var k in sourceNode){
                        if(k == "$$hashKey" || k == "__hashKey"){
                            continue;
                        }
                        if(k == "arguments"){
                            if(targetNode.tagName == "Call" || targetNode.tagName == "Function"){
                                targetNode.arguments = [];
                                for(var i = 0 ; i < sourceNode.arguments.length ; i++){
                                    targetNode.arguments.push(sourceNode.arguments[i]);
                                }
                            }
                        }
                        else if(k == "children"){
                            targetNode.children = [];
                            for(var i = 0 ; i < sourceNode.children.length ; i++){
                                targetNode.children.push(copyNode(sourceNode.children[i], {}));
                            }
                        }
                        else{
                            targetNode[k] = sourceNode[k];
                        }
                    }
                    return targetNode;
                };

                $scope.paste = function(node){
                    if(!node.children) {
                        node.children = [];
                    }
                    node.children.push(copyNode($scope.copyNode, {}));
                    $scope.templateStrategyUpdateForm.$setDirty();
                };

            }
        ]);
    }
);
