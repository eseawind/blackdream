package com.lite.blackdream.business.parameter.generator;

import com.lite.blackdream.business.domain.Generator;
import com.lite.blackdream.framework.model.Response;

/**
 * @author LaineyC
 */
public class GeneratorExportResponse extends Response<Generator> {

    public GeneratorExportResponse(){

    }

    public GeneratorExportResponse(Generator body){
        setBody(body);
    }

}
