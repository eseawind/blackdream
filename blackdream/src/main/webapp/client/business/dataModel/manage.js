define(
    ["angular", "business/module", "business/api"],
    function (angular, module) {
        "use strict";

        module.controller("dataModelManageController", [
            "$scope", "$uibModal", "$routeParams", "dataModelApi", "templateStrategyApi", "dynamicModelApi", "generatorInstanceApi", "$q", "viewPage", "clipboard","systemApi", "$cookies", "alert",
            function($scope, $uibModal, $routeParams, dataModelApi, templateStrategyApi, dynamicModelApi, generatorInstanceApi, $q, viewPage, clipboard, systemApi, $cookies, alert){
                viewPage.setViewPageTitle("工作台");
                var id = 1;
                var nextId = function(){
                    return id++;
                };

                var generatorInstanceId = $routeParams.generatorInstanceId;
                var dynamicModelCache = {};
                var dataModelCache = {};
                var dynamicModelKeysCache = {};
                var $outScope = $scope;
                $scope.dataModel = {};
                $scope.validateMessageCache = {};

                $scope.hashKey = function(entity){
                    return entity.$$hashKey.split(":")[1];
                };

                $scope.validateMessages = {
                    name:{
                        required:"必输项",
                        maxlength:"最长32位"
                    }
                };

                $scope.getMessage = function(field, $error, validateMessages){
                    for(var k in $error){
                        return validateMessages[field][k];
                    }
                };

                generatorInstanceApi.get({id: generatorInstanceId}).success(function(generatorInstance){
                    $scope.generatorInstance = generatorInstance;
                    $scope.dataModelControl.editable = generatorInstance.generator.isOpen || generatorInstance.user.id == generatorInstance.generator.developer.id;

                    if(!$scope.dataModelControl.editable){
                        alert.open({
                            message:"当前生成器正在维护，请暂停操作等待发布！"
                        });
                    }
                    else{
                        if(generatorInstance.version < generatorInstance.generator.version){
                            alert.open({
                                message:"当前生成器已升级发布，请确认！",
                                confirm:function(){
                                    generatorInstanceApi.versionSync({id:generatorInstance.id});
                                }
                            });
                        }
                    }

                    templateStrategyApi.query({generatorId:generatorInstance.generator.id}).success(function(templateStrategys){
                        $scope.templateStrategys = templateStrategys;
                        for(var i = 0 ; i < templateStrategys.length ; i++){
                            if(generatorInstance.templateStrategy && generatorInstance.templateStrategy.id == templateStrategys[i].id){
                                $scope.templateStrategyControl.selectedItem = templateStrategys[i];
                                break;
                            }
                        }
                    });

                    var dynamicModelApiQuery = dynamicModelApi.query({generatorId:generatorInstance.generator.id}).success(function(dynamicModels){
                        $scope.dynamicModels = dynamicModels;
                        var i;
                        var dynamicModel;
                        for(i = 0 ; i < dynamicModels.length ; i++){
                            dynamicModel = dynamicModels[i];
                            dynamicModelCache[dynamicModel.id] = dynamicModel;
                        }
                        for(i = 0 ; i < dynamicModels.length ; i++){
                            var j;
                            dynamicModel = dynamicModels[i];

                            var children = dynamicModel.children;
                            dynamicModel.children = [];
                            for(j = 0 ; j < children.length ; j++){
                                var child = children[j];
                                dynamicModel.children.push(dynamicModelCache[child.id]);
                            }

                            var propertiesMessages = {};
                            var associationMessages = {};
                            $scope.validateMessageCache[dynamicModel.id] = {
                                propertiesMessages:propertiesMessages,
                                associationMessages:associationMessages
                            };

                            var propertiesKeys = {dateTypeKeys:{},dataModelTypeKeys:{}};
                            var associationKeys = {dateTypeKeys:{},dataModelTypeKeys:{}};
                            dynamicModelKeysCache[dynamicModel.id] = {propertiesKeys: propertiesKeys, associationKeys:associationKeys};
                            var fromGroup = dynamicModel.fromGroup = [];
                            for(j = 0 ; j < dynamicModel.properties.length ; j++){
                                var property = dynamicModel.properties[j];

                                if(property.type == "Date"){
                                    propertiesKeys.dateTypeKeys[property.name] = true;
                                }
                                else if(property.type == "Model"){
                                    propertiesKeys.dataModelTypeKeys[property.name] = true;
                                }

                                if(property.cascadeScript){
                                    property.cascadeFunction = new Function("$property", property.cascadeScript);
                                }

                                var validator = property.validator;
                                if(validator){
                                    var fieldMessages = propertiesMessages[property.name] = {};
                                    if(validator.required){
                                        fieldMessages.required = "必输项";
                                    }
                                    if(validator.min != null && validator.min != undefined){
                                        fieldMessages.min = "最小" + validator.min;
                                    }
                                    if(validator.max != null && validator.max != undefined){
                                        fieldMessages.max = "最大" + validator.max;
                                    }
                                    if(validator.minlength != null && validator.minlength != undefined){
                                        fieldMessages.minlength = "最短" + validator.minlength + "位";
                                    }
                                    if(validator.maxlength != null && validator.maxlength != undefined){
                                        fieldMessages.maxlength = "最长" + validator.maxlength + "位";
                                    }
                                    if(validator.pattern != null && validator.pattern != undefined){
                                        fieldMessages.pattern = validator.patternTooltip || "格式不匹配" + validator.pattern;
                                    }
                                }

                                var group = property.group;
                                if(!group){
                                    fromGroup.push(property);
                                }
                                else{
                                    var prevFromGroup = fromGroup[fromGroup.length - 1];
                                    if(!prevFromGroup || group != prevFromGroup.group){
                                        fromGroup.push({group:group, children:[property]});
                                    }
                                    if(prevFromGroup && group == prevFromGroup.group){
                                        prevFromGroup.children.push(property);
                                    }
                                }

                            }

                            var tableHead = dynamicModel.tableHead = {groupHeads:[], heads:[]};
                            for(j = 0 ; j < dynamicModel.association.length ; j++){
                                var property = dynamicModel.association[j];
                                property.__hashKey = nextId();

                                if(property.type == "Date"){
                                    associationKeys.dateTypeKeys[property.name] = true;
                                }
                                else if(property.type == "Model"){
                                    associationKeys.dataModelTypeKeys[property.name] = true;
                                }

                                if(property.cascadeScript){
                                    property.cascadeFunction = new Function("$property", property.cascadeScript);
                                }

                                var validator = property.validator;
                                if(validator){
                                    var fieldMessages = associationMessages[property.name] = {};
                                    if(validator.required){
                                        fieldMessages.required = "必输项";
                                    }
                                    if(validator.min != null && validator.min != undefined){
                                        fieldMessages.min = "最小" + validator.min;
                                    }
                                    if(validator.max != null && validator.max != undefined){
                                        fieldMessages.max = "最大" + validator.max;
                                    }
                                    if(validator.minlength != null && validator.minlength != undefined){
                                        fieldMessages.minlength = "最短" + validator.minlength + "位";
                                    }
                                    if(validator.maxlength != null && validator.maxlength != undefined){
                                        fieldMessages.maxlength = "最长" + validator.maxlength + "位";
                                    }
                                    if(validator.pattern != null && validator.pattern != undefined){
                                        fieldMessages.pattern = validator.patternTooltip || "格式不匹配" + validator.pattern;
                                    }
                                }

                                property.$hide = property.canHide;
                                if(property.canHide){
                                    dynamicModel.hasHideCols = true;
                                }
                                if(property.$hide){
                                    continue;
                                }
                                var group = property.group;
                                if(!group){
                                    tableHead.groupHeads.push(property);
                                }
                                else{
                                    var prevHead = tableHead.groupHeads[tableHead.groupHeads.length - 1];
                                    if(!prevHead || group != prevHead.group){
                                        tableHead.groupHeads.push({group:group, span:1});
                                    }
                                    if(prevHead && group == prevHead.group){
                                        prevHead.span++;
                                    }
                                    tableHead.heads.push(property);
                                }

                            }

                            for(j = 0 ; j < dynamicModel.predefinedAssociation.length ; j++){
                                dynamicModel.predefinedAssociation[j].$check = true;
                            }

                        }
                    });

                    var dataModel;
                    var dataModelApiTree = dataModelApi.tree({rootId: generatorInstance.dataModel.id}).success(function(_dataModel){
                        dataModel = _dataModel;
                    });

                    $q.all([dynamicModelApiQuery, dataModelApiTree]).then(function(){
                        var init = function(sourceDataModel, targetDataModel){
                            dataModelCache[targetDataModel.id] = targetDataModel;
                            targetDataModel.id = sourceDataModel.id;
                            targetDataModel.children = [];
                            for(var i = 0 ; i < sourceDataModel.children.length ; i++){
                                var sourceChild = sourceDataModel.children[i];
                                var targetChild = {
                                    id:sourceChild.id,
                                    name:sourceChild.name,
                                    parent:targetDataModel,
                                    dynamicModel:dynamicModelCache[sourceChild.dynamicModel.id],
                                    properties:{},
                                    association:[],
                                    $runChecked:true,
                                    $dataDictionaryChecked:true
                                };
                                targetDataModel.children.push(targetChild);
                                init(sourceChild, targetChild);
                            }
                        };
                        init(dataModel, $scope.dataModel);
                    });
                });

                $scope.openConsoleModal = function(){
                    $uibModal.open({
                        size: "lg",
                        templateUrl: "dataModel/console.html",
                        controller: ["$scope","$uibModalInstance",function ($scope, $uibModalInstance){
                            $scope.runResults = $outScope.runResults;

                            $scope.download = function(url){
                                systemApi.download({url:url});
                            };

                            $scope.confirm = function(){
                                $uibModalInstance.close();
                            };

                            $scope.clear = function(){
                                $scope.runResults.length = 0;
                            };
                        }]
                    });
                };

                $scope.runResults = [];

                $scope.run = function(templateStrategy){
                    $uibModal.open({
                        templateUrl: "dataModel/dataModelRun.html",
                        controller: ["$scope", "$uibModalInstance", function ($scope, $uibModalInstance){
                            $scope.dataModel = $outScope.dataModel;
                            $scope.title = templateStrategy.name;

                            $scope.cancel = function(){
                                $uibModalInstance.close();
                            };

                            $scope.checkAll = function(){
                                $scope.$checkAll = !$scope.$checkAll;
                                var checkAll = function(dataModel){
                                    if(!dataModel.children){
                                        return;
                                    }

                                    var child;
                                    for(var i = 0 ; i < dataModel.children.length ; i++){
                                        child = dataModel.children[i];
                                        child.$runChecked = $scope.$checkAll;
                                        checkAll(child);
                                    }
                                };
                                checkAll($outScope.dataModel);
                            };

                            $scope.confirm = function(){
                                $uibModalInstance.close();
                                $uibModal.open({
                                    size: "lg",
                                    templateUrl: "dataModel/console.html",
                                    controller: ["$scope","$uibModalInstance", function ($scope, $uibModalInstance){
                                        $scope.runResults = $outScope.runResults;
                                        $scope.runningText = "正在生成并压缩文件...";

                                        var excludeIds = [];
                                        var getExcludeIds = function(dataModel){
                                            if(!dataModel.children){
                                                return;
                                            }

                                            var child;
                                            for(var i = 0 ; i < dataModel.children.length ; i++){
                                                child = dataModel.children[i];
                                                if(child.$runChecked){
                                                    getExcludeIds(child);
                                                }
                                                else{
                                                    excludeIds.push(child.id);
                                                }
                                            }
                                        };
                                        getExcludeIds($outScope.dataModel);

                                        generatorInstanceApi.run({id:generatorInstanceId, templateStrategyId:templateStrategy.id, excludeIds: excludeIds}).success(function(runResult){
                                            $scope.runningText = "";
                                            if(!runResult.url){
                                                $scope.runResults.push({type:"error", messages :runResult.messages});
                                            }
                                            else{
                                                $scope.runResults.push({type:"url", url :runResult.url, fileName:runResult.fileName});
                                            }
                                        });

                                        $scope.download = function(url){
                                            systemApi.download({url:url});
                                        };

                                        $scope.confirm = function(){
                                            $uibModalInstance.close();
                                        };

                                        $scope.clear = function(){
                                            $scope.runResults.length = 0;
                                        };
                                    }]
                                });
                            };
                        }]
                    });
                };

                $scope.dataDictionary =  function(){
                    $uibModal.open({
                        templateUrl: "dataModel/dataModelDataDictionary.html",
                        controller: ["$scope", "$uibModalInstance", function ($scope, $uibModalInstance){
                            $scope.dataModel = $outScope.dataModel;

                            $scope.cancel = function(){
                                $uibModalInstance.close();
                            };

                            $scope.checkAll = function(){
                                $scope.$checkAll = !$scope.$checkAll;
                                var checkAll = function(dataModel){
                                    if(!dataModel.children){
                                        return;
                                    }

                                    var child;
                                    for(var i = 0 ; i < dataModel.children.length ; i++){
                                        child = dataModel.children[i];
                                        child.$dataDictionaryChecked = $scope.$checkAll;
                                        checkAll(child);
                                    }
                                };
                                checkAll($outScope.dataModel);
                            };

                            $scope.confirm = function(){
                                $uibModalInstance.close();
                                $uibModal.open({
                                    size: "lg",
                                    templateUrl: "dataModel/console.html",
                                    controller: ["$scope","$uibModalInstance", function ($scope, $uibModalInstance){
                                        $scope.runResults = $outScope.runResults;
                                        $scope.runningText = "正在生成并压缩文件...";
                                        var theme = $cookies.get("theme") || "slate";

                                        var excludeIds = [];
                                        var getExcludeIds = function(dataModel){
                                            if(!dataModel.children){
                                                return;
                                            }

                                            var child;
                                            for(var i = 0 ; i < dataModel.children.length ; i++){
                                                child = dataModel.children[i];
                                                if(child.$dataDictionaryChecked){
                                                    getExcludeIds(child);
                                                }
                                                else{
                                                    excludeIds.push(child.id);
                                                }
                                            }
                                        };
                                        getExcludeIds($outScope.dataModel);

                                        generatorInstanceApi.dataDictionary({id:generatorInstanceId, theme:theme, excludeIds:excludeIds}).success(function(runResult){
                                            $scope.runningText = "";
                                            if(!runResult.url){
                                                $scope.runResults.push({type:"error", messages :runResult.messages});
                                            }
                                            else{
                                                $scope.runResults.push({type:"url", url :runResult.url, fileName:runResult.fileName});
                                            }
                                        });

                                        $scope.download = function(url){
                                            systemApi.download({url:url});
                                        };

                                        $scope.confirm = function(){
                                            $uibModalInstance.close();
                                        };

                                        $scope.clear = function(){
                                            $scope.runResults.length = 0;
                                        };
                                    }]
                                });
                            };
                        }]
                    });
                };

                $scope.dataModelControl = {
                    editable:true,
                    sortableOptions : {
                        update: function(e, ui) {
                            dataModelApi.sort({
                                id:ui.item.sortable.model.id,
                                rootId:$scope.generatorInstance.dataModel.id,
                                fromIndex:ui.item.sortable.index,
                                toIndex:ui.item.sortable.dropindex
                            });
                        },
                        stop: function(e, ui) {

                        }
                    },
                    dirtyData:{
                        deleteData:{},
                        updateData:{},
                        hasDirtyData:function(){
                            var k;
                            for(k in $scope.dataModelControl.dirtyData.deleteData){
                                return true;
                            }
                            for(k in $scope.dataModelControl.dirtyData.updateData){
                                return true;
                            }
                            return false
                        },
                        addDeleteData:function(dataModel){
                            if(dataModel.id > 0){
                                $scope.dataModelControl.dirtyData.deleteData[dataModel.id] = dataModel;
                            }
                            delete $scope.dataModelControl.dirtyData.updateData[dataModel.id];
                        },
                        addUpdateData:function(dataModel){
                            $scope.dataModelControl.dirtyData.updateData[dataModel.id] = dataModel;
                        }
                    },
                    formatProperties:function(dynamicModel, properties){
                        var newProperties = {};
                        var dynamicModelKeys = dynamicModelKeysCache[dynamicModel.id];
                        for(var k in properties){
                            if(properties[k] == undefined || properties[k] == null){
                                continue;
                            }
                            if(k in dynamicModelKeys.propertiesKeys.dateTypeKeys){
                                newProperties[k] = new Date(properties[k]).getTime();
                            }
                            else if(k in dynamicModelKeys.propertiesKeys.dataModelTypeKeys){
                                newProperties[k] = properties[k].id;
                            }
                            else{
                                newProperties[k] = properties[k];
                            }
                        }
                        return newProperties;
                    },
                    formatAssociation:function(dynamicModel, association){
                        var newAssociation = [];
                        var dynamicModelKeys = dynamicModelKeysCache[dynamicModel.id];
                        for(var i = 0 ; i < association.length ;i++){
                            var property = association[i];
                            var newProperty = {};
                            for(var k in property){
                                if(k == "__hashKey" || property[k] == undefined || property[k] == null){
                                    continue;
                                }
                                if(k in dynamicModelKeys.associationKeys.dateTypeKeys){
                                    newProperty[k] = new Date(property[k]).getTime();
                                }
                                else if(k in dynamicModelKeys.associationKeys.dataModelTypeKeys){
                                    newProperty[k] = property[k].id;
                                }
                                else{
                                    newProperty[k] = property[k];
                                }
                            }
                            newAssociation.push(newProperty);
                        }
                        return newAssociation;
                    },
                    saveDirty: function(){
                        var data = $scope.dataModelControl.dirtyData;
                        var k;
                        for(k in data.updateData){
                            (function(){
                                var dataModel = data.updateData[k];
                                dataModelApi.update({
                                    id:dataModel.id,
                                    rootId:$scope.generatorInstance.dataModel.id,
                                    name:dataModel.name,
                                    dynamicModelId:dataModel.dynamicModel.id,
                                    properties:$scope.dataModelControl.formatProperties(dataModel.dynamicModel,dataModel.properties),
                                    association:$scope.dataModelControl.formatAssociation(dataModel.dynamicModel,dataModel.association)
                                }).success(function(){
                                    delete data.updateData[dataModel.id];
                                    if(dataModel.$scope && dataModel.$scope.dataModelEditForm){
                                        dataModel.$scope.dataModelEditForm.$setPristine();
                                    }
                                });
                            })();
                        }
                        for(k in data.deleteData){
                            (function(){
                                var dataModel = data.deleteData[k];
                                dataModelApi.delete({
                                    id:dataModel.id,
                                    rootId:$scope.generatorInstance.dataModel.id
                                }).success(function(){
                                    delete data.deleteData[dataModel.id];
                                });
                            })();
                        }
                    },
                    index: 1,
                    add: function(dynamicModel, parent){
                        parent = parent == null ? $scope.dataModel : parent;
                        var id = $scope.dataModelControl.index++;

                        var dynamicModelProperties = dynamicModel.properties;
                        var properties = {};
                        for(var i = 0 ; i < dynamicModelProperties.length ; i++){
                            var property = dynamicModelProperties[i];
                            if(property.defaultValue != null){
                                properties[property.name] = property.defaultValue;
                            }
                        }

                        var dataModel = {id: 0 - id, dynamicModel: dynamicModel, parent:parent, properties:properties, association:[], name:"新建" + dynamicModel.name + "(" + id + ")", $view:true, $runChecked:true, $dataDictionaryChecked:true};
                        dataModelApi.create({
                            rootId:$scope.generatorInstance.dataModel.id,
                            name:dataModel.name,
                            dynamicModelId:dataModel.dynamicModel.id,
                            //generatorInstanceId:$scope.generatorInstance.id,
                            parentId:dataModel.parent.id,
                            properties:dataModel.properties,
                            association:dataModel.association
                        }).success(function(d){
                            dataModel.id = d.id;
                            dataModelCache[dataModel.id] = dataModel;
                            if(dataModel.$scope && dataModel.$scope.dataModelEditForm){
                                dataModel.$scope.dataModelEditForm.$setPristine();
                            }
                            if(!parent.children){
                                parent.children = [];
                            }
                            parent.children.push(dataModel);
                            parent.$expend = true;
                            $scope.tabsControl.add(dataModel);
                        });
                    },
                    view:function(dataModel){
                        if(dataModel.$view || $scope.tabsControl.contains(dataModel)){
                            $scope.tabsControl.add(dataModel);
                        }
                        else{
                            dataModelApi.get({id:dataModel.id, rootId: $scope.generatorInstance.dataModel.id}).success(function(dm){
                                dataModel.$view = true;
                                dataModel.properties = dm.properties;
                                dataModel.association = dm.association;

                                var dynamicModelKeys = dynamicModelKeysCache[dataModel.dynamicModel.id];
                                for(var k in dataModel.properties){
                                    if(k in dynamicModelKeys.propertiesKeys.dataModelTypeKeys){
                                        var propertyDataModel = dataModelCache[dataModel.properties[k]];
                                        dataModel.properties[k] = {id:propertyDataModel.id,name:propertyDataModel.name};
                                    }
                                }
                                for(var i = 0 ; i < dataModel.association.length ;i++){
                                    var property = dataModel.association[i];
                                    for(var k in property){
                                        if(k in dynamicModelKeys.associationKeys.dataModelTypeKeys){
                                            var propertyDataModel = dataModelCache[property[k]];
                                            property[k] = {id:propertyDataModel.id,name:propertyDataModel.name};
                                        }
                                    }
                                    property.__hashKey = nextId();
                                }

                                $scope.tabsControl.add(dataModel);
                            });
                        }
                    },
                    "delete":function(parent, $index, child){
                        parent.children.splice($index, 1);
                        delete dataModelCache[child.id];
                        $scope.dataModelControl.dirtyData.addDeleteData(child);
                        $scope.tabsControl.remove(child);
                    },
                    copyAll:function(dataModel){
                        dataModel.$copyAll = !dataModel.$copyAll;
                        for(var i = 0 ; i < dataModel.association.length ; i++){
                            dataModel.association[i].$copy = dataModel.$copyAll;
                        }
                    }
                };

                $scope.tabsControl = {
                    data:[],
                    add:function(dataModel){
                        $scope.tabsControl.remove(dataModel);
                        dataModel.active = true;
                        $scope.tabsControl.data.splice(0, 0, dataModel);
                        if($scope.tabsControl.data.length > 100){
                            $scope.tabsControl.data.length = 100;
                        }
                    },
                    contains:function(dataModel){
                        var data = $scope.tabsControl.data;
                        for(var i = 0 ; i < data.length ; i++){
                            if(dataModel == data[i]){
                                return true;
                            }
                        }
                        return false;
                    },
                    remove:function(dataModel){
                        var data = $scope.tabsControl.data;
                        for(var i = 0 ; i < data.length ; i++){
                            if(dataModel == data[i]){
                                data.splice(i, 1);
                                break;
                            }
                        }
                    },
                    initScope:function(dataModel, $scope){
                        dataModel.$scope = $scope;
                        $scope.sortableOptions ={
                            update: function(e, ui) {
                                $scope.dataModelEditForm.$setDirty();
                            },
                            stop: function(e, ui) {

                            }
                        };
                        $scope.$watch("dataModelEditForm.$dirty",function(newValue, oldValue){
                            if(newValue){
                                $scope.dataModelControl.dirtyData.addUpdateData(dataModel);
                            }
                        });
                    },
                    addProperty:function(dataModel){
                        var association = dataModel.dynamicModel.association;
                        var record = {__hashKey:nextId()};
                        for(var i = 0 ; i < association.length ; i++){
                            var property = association[i];
                            if(property.defaultValue != null){
                                record[property.name] = property.defaultValue;
                            }
                        }
                        dataModel.association.push(record);
                        dataModel.$scope.dataModelEditForm.$setDirty();
                    },
                    addMultiProperty:function(dataModel, n){
                        for(var i = 1 ; i <= n ; i++){
                            $scope.tabsControl.addProperty(dataModel);
                        }
                    },
                    predefinedPropertySetModalOpen:function(dataModel){
                        $uibModal.open({
                            size:"80-percent",
                            templateUrl: "dataModel/predefinedPropertySet.html",
                            controller: ["$scope", "$uibModalInstance", function ($scope, $uibModalInstance){
                                $scope.dataModel = $outScope.dataModel;
                                $scope.dynamicModel = dataModel.dynamicModel;
                                $scope.tableHead = dataModel.dynamicModel.tableHead;
                                $scope.title = "快捷设置 - " + dataModel.dynamicModel.name;

                                $scope.confirm = function(){
                                    $uibModalInstance.close();
                                };

                            }]
                        });
                    },
                    addPredefinedProperty:function(dataModel){
                        var predefinedAssociation = dataModel.dynamicModel.predefinedAssociation;
                        for(var i = 0 ; i < predefinedAssociation.length ; i++){
                            var property = predefinedAssociation[i];
                            if(!property.$check){
                                continue;
                            }
                            var record = {__hashKey:nextId()};
                            for(var k in property){
                                record[k] = property[k];
                            }
                            dataModel.association.push(record);
                        }
                        dataModel.$scope.dataModelEditForm.$setDirty();
                    },
                    copyPropertyBegin:function(dataModel){
                        dataModel.$copy = true;
                    },
                    copyPropertyCancel:function(dataModel){
                        if(!dataModel.$copy){
                            return;
                        }
                        for(var i = 0 ; i < dataModel.association.length ; i++){
                            var property = dataModel.association[i];
                            if(property.$copy){
                                delete property.$copy;
                            }
                        }
                        dataModel.$copyAll = false;
                        dataModel.$copy = false;
                    },
                    copyProperty:function(dataModel){
                        if(!dataModel.$copy){
                            return;
                        }
                        var association = [];
                        for(var i = 0 ; i < dataModel.association.length ; i++){
                            var property = dataModel.association[i];
                            if(property.$copy){
                                delete property.$copy;
                                association.push(property);
                            }
                        }
                        clipboard.copy(dataModel.dynamicModel.id, association);
                        dataModel.$copyAll = false;
                        dataModel.$copy = false;
                    },
                    hasClipboard:function(dataModel){
                        var association = clipboard.get(dataModel.dynamicModel.id);
                        return association && association.length;
                    },
                    pasteProperty:function(dataModel){
                        var association = clipboard.get(dataModel.dynamicModel.id);
                        if(!association){
                            return;
                        }
                        for(var i = 0 ; i < association.length ; i++){
                            var property = association[i];
                            var record = {__hashKey:nextId()};
                            for(var k in property){
                                if(k == "$$hashKey" || k == "__hashKey"){
                                    continue;
                                }
                                record[k] = property[k];
                            }
                            dataModel.association.push(record);
                        }
                        dataModel.$scope.dataModelEditForm.$setDirty();
                    },
                    removeProperty:function(dataModel, $index){
                        dataModel.association.splice($index, 1);
                        dataModel.$scope.dataModelEditForm.$setDirty();
                    },
                    showOrHideCols:function(dataModel){
                        var dynamicModel = dataModel.dynamicModel;
                        dynamicModel.$hideCols = dynamicModel.$hideCols == undefined ? false : !dynamicModel.$hideCols;
                        var tableHead = dynamicModel.tableHead = {groupHeads:[], heads:[]};
                        for(var j = 0 ; j < dynamicModel.association.length ; j++){
                            var property = dynamicModel.association[j];
                            property.$hide = property.canHide && dynamicModel.$hideCols;
                            if(property.$hide){
                                continue;
                            }
                            var group = property.group;
                            if(!group){
                                tableHead.groupHeads.push(property);
                            }
                            else{
                                var prevHead = tableHead.groupHeads[tableHead.groupHeads.length - 1];
                                if(!prevHead || group != prevHead.group){
                                    tableHead.groupHeads.push({group:group, span:1});
                                }
                                if(prevHead && group == prevHead.group){
                                    prevHead.span++;
                                }
                                tableHead.heads.push(property);
                            }
                        }
                    },
                    resetHead:function(dataModel){
                        var dynamicModel = dataModel.dynamicModel;
                        var tableHead = dynamicModel.tableHead = {groupHeads:[], heads:[]};
                        for(var j = 0 ; j < dynamicModel.association.length ; j++){
                            var property = dynamicModel.association[j];
                            if(property.$hide){
                                continue;
                            }
                            var group = property.group;
                            if(!group){
                                tableHead.groupHeads.push(property);
                            }
                            else{
                                var prevHead = tableHead.groupHeads[tableHead.groupHeads.length - 1];
                                if(!prevHead || group != prevHead.group){
                                    tableHead.groupHeads.push({group:group, span:1});
                                }
                                if(prevHead && group == prevHead.group){
                                    prevHead.span++;
                                }
                                tableHead.heads.push(property);
                            }
                        }
                    }
                };

                $scope.dataModelPickerModalOpen = function(dataModel, valueModel, propertyName, title, $ctrl){
                    $uibModal.open({
                        templateUrl: "dataModel/dataModelPicker.html",
                        controller: ["$scope", "$uibModalInstance", function ($scope, $uibModalInstance){
                            $scope.dataModel = $outScope.dataModel;
                            $scope.title = "选择" + title;

                            $scope.select = function(selectDataModel){
                                valueModel[propertyName] = {id:selectDataModel.id,name:selectDataModel.name};
                                $outScope.dataModelControl.dirtyData.addUpdateData(dataModel);
                                $uibModalInstance.close();
                            };

                            $scope.clear = function(){
                                valueModel[propertyName] = null;
                                $ctrl.$setViewValue(null);
                                $ctrl.$render();
                                $outScope.dataModelControl.dirtyData.addUpdateData(dataModel);
                                $uibModalInstance.close();
                            };

                            $scope.confirm = function(){
                                $uibModalInstance.close();
                            };

                        }]
                    });
                };

            }
        ]);
    }
);
