package com.lite.blackdream.business.controller;

import com.lite.blackdream.business.parameter.system.FileDownloadRequest;
import com.lite.blackdream.business.parameter.system.FileDownloadResponse;
import com.lite.blackdream.business.parameter.system.SessionHeartbeatRequest;
import com.lite.blackdream.business.parameter.system.SessionHeartbeatResponse;
import com.lite.blackdream.framework.component.BaseController;
import com.lite.blackdream.framework.util.ConfigProperties;
import org.apache.commons.io.FileUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import javax.servlet.http.HttpServletResponse;
import java.io.*;

/**
 * @author LaineyC
 */
@Controller
public class SystemController extends BaseController {

    @ResponseBody
    @RequestMapping(params="method=session.heartbeat")
    public SessionHeartbeatResponse heartbeat(SessionHeartbeatRequest request) {
        return new SessionHeartbeatResponse();
    }

    @RequestMapping(params="method=file.download")
    public ResponseEntity<byte[]> download(FileDownloadRequest request) throws IOException {
        String url = request.getUrl();
        File file = new File(ConfigProperties.TEMPORARY_PATH + ConfigProperties.fileSeparator + url);
        HttpHeaders headers = new HttpHeaders();
        String fileName = file.getName();
        headers.setContentDispositionFormData("attachment", fileName);
        headers.add("filename", fileName);
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        return new ResponseEntity<>(FileUtils.readFileToByteArray(file), headers, HttpStatus.CREATED);
    }

}
