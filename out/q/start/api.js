(function(){"use strict";var e="ACME_HTML_choice_acmeURL",t="ACME_HTML_input_domains",a="ACME_HTML_input_email",n={};window.initMainUI=function(){$(".eccCurveNames").html(X509.SupportECCType2Names().join(Lang("、",", "))),$(".donateBtnIco").html(unescape("%uD83D%uDE18")),$(".versionBox").html(Lang("版本: "+Version,"Ver: "+Version)),/mobile/i.test(navigator.userAgent)&&($(".main").prepend($(".langBtnBox").css("position",null)),$(".donateWidget").css("position",null)),CLog("initMainUI",0,Lang("OK","OK")),A(),acmeReadDirGotoCORSInit(),downloadFileNameShow(),o(),c(),E()};var i,o=function(){$("input[name=choice_acmeURL]").bind("click",function(e){var t=e.target,a="manual"==t.value;$(".in_acmeURL").css("opacity",a?1:.4).val(a?i:t.value).attr("readonly",a?null:"");var n=$(t).attr("desckey");$(".descAcmeURL").hide(),n&&$("."+n).show(),i="",g()}),r()},r=function(){i=n.acmeURL||window.Default_ACME_URL||localStorage[e]||"";var t=$("input[name=choice_acmeURL]"),a=0;if(i){for(var o=0,r=0;r<t.length;r++)t[r].value==i&&(a=r+1),"manual"==t[r].value&&(o=r+1);a||(a=o),a--}t[a].click()},c=function(){$(".privateKeyBox").hide(),$("input[name=choice_privateKey]").bind("click",function(e){var t=e.target,a="manual"==t.value;$(".in_privateKey").css("opacity",a?1:.4).val("").attr("readonly",a?null:""),$(".privateKeyBox").show(),C(t.value),h()}),$(".accountKeyBox").hide(),$("input[name=choice_accountKey]").bind("click",function(e){var t=e.target,a="manual"==t.value;$(".in_accountKey").css("opacity",a?1:.4).val("").attr("readonly",a?null:""),$(".accountKeyBox").show(),L(t.value),h()})},s=function(){return"<span>"+Lang("继续"," ")+"</span>"},l=function(){return Lang(" 请稍候... "," Please wait... ")},u=function(){return Lang(" 请重试！"," Please try again! ")},d=function(e,t,a,n){var i=new Date,o=("0"+i.getHours()).substr(-2)+":"+("0"+i.getMinutes()).substr(-2)+":"+("0"+i.getSeconds()).substr(-2);return $(e).html(!1===t?"":'<div style="color:'+(a?1==a?"red":2==a?"#0b1":3==a?"#fa0":a:"")+'">'+(null==n?"["+o+"] ":n)+t+"</div>"),t};window.Toast=function(e,t,a){d(".toastState",e,t,""),$(".toastState").show(),clearTimeout(Toast._int),Toast._int=setTimeout(function(){$(".toastState").hide()},a||5e3)},window.onerror=function(e,t,a,n,i){Toast("【Uncaught Error】"+e+"<pre>at:"+a+":"+n+" url:"+t+"\n"+(i&&i.stack||"-")+"</pre>",1,15e3)};var p=0,f=function(e,t,a){if(e!=p){var n=Lang("被终止","Abort",1);return CLog(t+" "+n,3,"From: "+a+" ["+n+"]"),!0}},g=function(){p++,$(".step1Hide").hide(),$(".step1Show").show(),d(".acmeReadDirState",!1),$(".in_acmeURL").val()&&acmeReadDirClick()};window.acmeReadDirClick=function(){var t=++p;$(".step1Hide").hide(),$(".step1Show").show();var a="Step-1",n=".acmeReadDirState",i=$(".in_acmeURL").val().trim();if(i){localStorage[e]=i,i=ACME.URL=i.replace(/\/$/,"");var o,r=CLog(a,0,d(n,l()+Lang("正在初始化，"," ")+" URL="+ACME.URL,2)),c=function(){ACME.Directory(function(e,t){o=function(a,n){e.corsOK=a?1:-1,e.corsError=n||"",t()},1==e.corsOK?g():-1==e.corsOK?L(e.corsError,!0):C()},function(e,i){f(t,a,r+" err: "+e)||(0===i?(CLog(a,1,d(n,Lang("初始化出错：无法访问此URL。","Read service directory error: This URL cannot be accessed.")+u(),1)),acmeReadDirGotoCORS(Lang("如果你可以在浏览器中直接打开并访问此ACME服务URL，代表此ACME服务对跨域访问支持不良，则请按下面步骤操作：","If you can open and access this ACME service URL directly in your browser, it represents that this ACME service has poor support for cross-domain access, please follow the steps below:"))):CLog(a,1,d(n,Lang("初始化出错："+e,"Read service directory error: "+e)+u(),1)))})},g=function(){f(t,a,r)||(h(),CLog(a,0,d(n,Lang("正常，"," ")+s(),2),ACME.DirData))},C=function(){f(t,a,r)||(r=CLog(a,0,d(n,l()+Lang("正在测试浏览器支持情况，","Testing browser support for this ACME service, ")+" URL="+ACME.URL,2)),ACME.GetNonce(!0,function(){ACME.TestAccountCORS(function(){CLog(a,0,Lang("此 ACME 服务对浏览器的支持良好。","This ACME service has good browser support.")),o(!0),g()},L)},function(e,t){t&&o(!1,e),L(e,t)}))},L=function(e,i){f(t,a,r+" err: "+e)||(CLog(a,1,d(n,Lang("测试此ACME服务对浏览器的支持情况，发生错误："+e,"Test browser support for this ACME service, An error occurred: "+e)+(i?"":u()),1)),LangReview(n),i&&acmeReadDirGotoCORS())};c()}else d(n,Lang("请填写服务URL！","Please fill in the service URL!"),1)};var h=function(){document.getElementById("q-steps1").style.display="none",document.getElementById("q-steps2").style.display="",$(".step2Hide").hide(),$(".step2Show").show(),d(".configStepState",!1),$(".eabShow")[ACME.StepData.needEAB?"show":"hide"](),n.eabKid&&$(".in_eab_kid").val(n.eabKid),n.eabKey&&$(".in_eab_key").val(n.eabKey),$(".termsAgreeBox")[ACME.StepData.termsURL?"show":"hide"](),$(".termsAgreeTips").html(Lang('我同意此证书颁发机构ACME服务的<a href="'+ACME.StepData.termsURL+'" target="_blank">服务条款</a>。','I agree to the <a href="'+ACME.StepData.termsURL+'" target="_blank">terms of service</a> for this Certificate Authority ACME Service.')),$(".choice_termsAgree").prop("checked",!0);var e=$(".in_domains"),i=localStorage[t],o=n.domains&&n.domains.join(", ")||i;e.val()||e.val(o||""),$(".choice_domains_store").prop("checked",!!i);e=$(".in_email"),i=localStorage[a],o=n.email||i;e.val()||e.val(o||""),$(".choice_email_store").prop("checked",!!i);var r=function(e){n[e]&&($("input[name=choice_"+e+"][value=manual]")[0].click(),$(".in_"+e).val(n[e]))};r("privateKey"),r("accountKey"),n={}},C=function(e){var t,a=++p,n="Step-2",i=".privateKeyState",o="";if("generateRSA"==e)e="RSA",t=X509.DefaultType2_RSA,o=Lang("证书 RSA 私钥 ("+t+" Bit)"," ");else{if("generateECC"!=e)return void d(i,!1);e="ECC",t=X509.DefaultType2_ECC;var r=X509.SupportECCType2[t]||t;o=Lang("证书 ECC 私钥 ("+r+")"," ")}var c=CLog(n,0,d(i,l()+Lang("正在创建","Generating ")+o,2));X509.KeyGenerate(e,t,function(e){f(a,n,c)||($(".in_privateKey").val(e),CLog(n,0,d(i,o+Lang("，创建成功。",", generated successfully."),2),"\n"+e))},function(e){f(a,n,c+" err: "+e)||CLog(n,1,d(i,o+Lang("，发生错误："+e,", An error occurred: "+e),1))})},L=function(e){var t,a=++p,n="Step-2",i=".accountKeyState",o="";if("generateRSA"==e)e="RSA",t=X509.DefaultType2_RSA,o=Lang("ACME 账户 RSA 私钥 ("+t+" Bit)"," ");else{if("generateECC"!=e)return void d(i,!1);e="ECC",t=X509.DefaultType2_ECC;var r=X509.SupportECCType2[t]||t;o=Lang("ACME 账户 ECC 私钥 ("+r+")"," ")}var c=CLog(n,0,d(i,l()+Lang("正在创建","Generating ")+o,2));X509.KeyGenerate(e,t,function(e){f(a,n,c)||($(".in_accountKey").val(e),CLog(n,0,d(i,o+Lang("，创建成功，请复制保管，下次输入自己的账户私钥。",", generated successfully."),2),"\n"+e))},function(e){f(a,n,c+" err: "+e)||CLog(n,1,d(i,o+Lang("，发生错误："+e,", An error occurred: "+e),1))})};window.configStepClick=function(){var e=++p,n="Step-2",i=".configStepState";$(".step2Hide").hide(),$(".step2Show").show(),d(i,!1);var o=$(".in_domains").val().trim(),r=$(".choice_domains_store").prop("checked"),c=$(".in_privateKey").val().trim(),u=$(".in_accountKey").val().trim(),g=$(".in_email").val().trim(),h=$(".choice_email_store").prop("checked"),C=$(".in_eab_kid").val().trim(),L=$(".in_eab_key").val().trim(),v=$(".choice_termsAgree").prop("checked");o=o.replace(/\s+/g,",").replace(/，+/g,",").split(/,+/);for(var y=0,E={};y<o.length;y++){var S=o[y];if(S){if(E[S])return d(i,Lang("域名"+S+"重复！","Duplicate domain name "+S+"!"),1);if(/[:\/;]/.test(S))return d(i,Lang("域名"+S+"格式错误！","Format error of domain name "+S+"!"),1);E[S]=1}else o.splice(y,1),y--}if(localStorage[t]=r?o.join(", "):"",localStorage[a]=h?g:"",!o.length)return d(i,Lang("ERROR 域名是必须项。"," "),1);if(!u)return d(i,Lang("ERROR 需要创建或输入 ACME 账户的私钥。"," "),1);if(!c)return d(i,Lang("ERROR 需要证书的私钥。"," "),1);if(!/.+@.+\..+/.test(g)||/[\s,;]/.test(g))return d(i,Lang("ERROR 需要填写电子邮箱地址。"," "),1);if(ACME.StepData.needEAB&&(!C||!L))return d(i,Lang("EAB KID and HMAC KEY not found."," "),1);if(ACME.StepData.termsURL&&!v)return d(i,Lang("ERROR 需要同意使用条款。"," "),1);var w,A,M=function(){X509.KeyParse(c,function(e){w=e,R()},function(e){d(i,Lang("ERROR 证书私钥无效","The private key of the certificate is invalid: "),1)},1)},R=function(){X509.KeyParse(u,function(e){A=e,D()},function(e){d(i,Lang("ERROR 账户私钥无效，无法工作，请前往<a href='/settings/'>设置</a>页面清空数据","The private key of the ACME account is invalid: "),1)},1)},_=CLog(n,0,d(i,l(),2)),D=function(){f(e,n,_)||(ACME.StepData.config={domains:o,privateKey:w,accountKey:A,email:g,eabKid:C,eabKey:L},CLog(n,0,"config",ACME.StepData.config),T())},T=function(){var t=CLog(n,0,d(i,l()+Lang("调用 ACME 服务 newAccount 接口："," ")+ACME.DirData.newAccount,2));ACME.StepAccount(function(){f(e,n,t)||b()},function(a){f(e,n,t+" err: "+a)||CLog(n,1,d(i,Lang("调用 ACME 服务的 newAccount 接口："," ")+ACME.DirData.newAccount+Lang("，发生错误："+a,", An error occurred: "+a),1))})},b=function(){var t,a=function(a){e==p&&(t=CLog(n,0,d(i,l()+Lang("调用 ACME 服务订单接口。"," ")+" "+a+" URL:"+ACME.DirData.newOrder,2)))};a(""),ACME.StepOrder(a,function(){f(e,n,t)||K()},function(a){f(e,n,t+" err: "+a)||CLog(n,1,d(i,Lang("调用 ACME 服务订单接口：","Call the order interface of the ACME service: ")+ACME.DirData.newOrder+Lang("，发生错误："+a,", An error occurred: "+a),1))})},K=function(){m(),CLog(n,0,d(i,Lang("配置完成，","Configuration is complete, ")+s(),2),ACME.StepData)};M()};var v,m=function(){document.getElementById("q-steps2").style.display="none",document.getElementById("q-steps3").style.display="",$(".step3Hide").hide(),$(".step3Show").show(),$(".verifyStepBtn").show(),$(".verifyRunStopBtn").hide(),$(".finalizeOrderBtn").hide(),d(".verifyStepState",!1),verifyBoxShow()};window.verifyRunStopClick=function(){++p;$(".verifyStepBtn").show(),$(".verifyRunStopBtn").hide(),$(".finalizeOrderBtn").hide(),d(".verifyStepState",!1),v&&v()},window.verifyStepClick=function(){var e=++p,t="Step-3",a=".verifyStepState";$(".step3Hide").hide(),$(".step3Show").show(),$(".verifyStepBtn").hide(),$(".verifyRunStopBtn").show(),$(".finalizeOrderBtn").hide(),d(a,!1);var n=ACME.StepData.config.domains,i=ACME.StepData.auths,o=function(o,r,c){for(var s=r||e!=p,l=0,u=0,f=0,g=0;g<n.length;g++){var h=n[g],C=i[h],L=C.challenges,v=$(".verifyItemState_"+g);if(11!=C.authState){if(o){for(var m=$("input[name=choice_authItem_"+g+"]"),y=0;y<m.length;y++){var E=m[y];E.checked?C.challIdx=+$(E).attr("challidx"):$(E.parentNode).hide()}C.authState=0,C.authTryCount=0,C.authError="",C.authTimer=0}var S=ACME.ChallName(L[C.challIdx]);12!=C.authState?(f++,s?(d(v,!1),clearTimeout(C.authTimer),C.authTimer=0):2==C.authState?d(v,Lang("等待重试中...","Waiting for retry...")+" "+C.authTryCount+" "+C.authError,3,""):1==C.authState?d(v,Lang("验证中...","Verify in progress..."),0,""):d(v,Lang("等待验证...","Waiting for verify..."),0,"")):(d(v,S+Lang("，验证失败：",", Verify failed: ")+C.authError,1,""),u++)}else d(v,ACME.ChallName(L[C.challIdx])+" OK!",2,""),l++}if(!s||r){var w=Lang("请重试"," "),A=d(a,(c?Lang("验证失败，","Verify failed, ")+w:s?Lang("已取消，","Canceled, ")+w:Lang("正在验证，请耐心等待... ","Verifying, please wait... "))+"<div>"+Lang("验证通过：","Verify pass: ")+l+", "+Lang("未通过：","Failed: ")+u+", "+Lang("验证中：","Verify in progress: ")+f+"</div>",s?1:0);s&&CLog(t,1,A)}};o(1);var r=function(){if(e==p){o();for(var t,a=0,c=0,s=0,l=0;l<n.length;l++){var u=n[l],d=i[u];t||d.authState||(t=d),1==d.authState&&a++,11==d.authState&&c++,12==d.authState&&s++}return c==n.length?h():c+s==n.length?g():void(t&&!a&&(t.authState=1,t.authTryCount++,t.authError="",o(),ACME.StepVerifyAuthItem(t,t.challIdx,function(a,n,i){e==p&&(a?t.authState=11:(t.authState=2,t.authError=i,t.authTimer=setTimeout(function(){t.authState=0,t.authTimer=0,r()},n)),r())},function(a){e==p&&(t.authState=12,t.authError=a,r())})))}};CLog(t,0,"==========Verify Start==========");var c=function(){$(".verifyRunStopBtn").hide(),v=null,CLog(t,0,"==========Verify End==========")};v=function(){c(),o(0,1)};var g=function(){CLog(t,1,"Verify Fail!"),o(0,1,1),c()},h=function(){CLog(t,0,"Verify OK!"),c(),finalizeOrderClick()};window.finalizeOrderClick=function(){$(".finalizeOrderBtn").hide();var n,i=function(i){e==p&&(n=CLog(t,0,d(a,l()+Lang("验证已通过，正在签发证书。","Verify passed, issuing certificate.")+" "+i,2)))};i(""),ACME.StepFinalizeOrder(i,function(){f(e,t,n)||(y(),CLog(t,0,d(a,Lang("验证已通过，证书已签发，","Verification passed, The certificate has been issued, ")+s(),2),ACME.StepData))},function(i){f(e,t,n+" err: "+i)||($(".finalizeOrderBtn").show(),CLog(t,1,d(a,Lang("签发证书发生错误，","Error issuing certificate, ")+u()+Lang("如果多次重试都无法签发证书，请直接刷新页面重新开始。","If the certificate cannot be issued after multiple retries, you may need to return to step 2 to restart the operation.")+" Error: "+i,1)))})},r()};var y=function(){document.getElementById("q-steps2").style.display="none",document.getElementById("q-steps3").style.display="none",document.getElementById("q-steps4").style.display="",$(".step4Hide").hide(),$(".step4Show").show(),d(".downloadStepState",!1);var e=ACME.StepData.config,t=ACME.StepData.order.downloadPEM,a=t||Lang("未发现证书，请刷新页面重新开始。","No certificate found, please go to the step 2 to operate again!",!0);$(".txt_downloadCert").val(a),$(".txt_downloadKey").val(e.privateKey.pem),S=e.domains[0].replace(/^\*\./g,"").replace(/[^\w]/g,"_"),downloadFileNameShow(S);var n=[],i=function(e){return n.push("\n=========== "+e+" ==========="),n},o=Object.assign({acmeURL:ACME.URL,accountURL:ACME.StepData.account.url,X509:{DefaultType2_RSA:X509.DefaultType2_RSA,DefaultType2_ECC:X509.DefaultType2_ECC},Window:{DefaultDownloadFileNames:DefaultDownloadFileNames}},e);o.privateKey=e.privateKey.pem,o.accountKey=e.accountKey.pem;var r="/********** "+Lang($(".clientNameCN").html(),$(".clientNameEN").html(),!0)+" *********/";n.push(r),n.push(Lang("在线网址（GitHub）：","Online website (GitHub): ",!0)+"https://xiangyuecn.github.io/ACME-HTML-Web-Browser-Client/ACME-HTML-Web-Browser-Client.html"),n.push(Lang("在线网址（Gitee）：","Online website (Gitee): ",!0)+"https://xiangyuecn.gitee.io/acme-html-web-browser-client/ACME-HTML-Web-Browser-Client.html"),n.push(""),n.push("GitHub: https://github.com/xiangyuecn/ACME-HTML-Web-Browser-Client"),n.push("Gitee: https://gitee.com/xiangyuecn/ACME-HTML-Web-Browser-Client"),n.push(""),n.push(Lang("提示：你可以将本文件拖拽进客户端网页内，将自动填充本次证书申请的所有配置参数。","Tip: You can drag and drop this file into the client web page, and all configuration parameters of this certificate application will be filled automatically.",!0)),n.push(""),i(Lang("证书申请时间","Certificate Application Time",!0)).push((new Date).toLocaleString()),i(Lang("域名列表","Domain Name List",!0)).push(e.domains.join(", ")),i(Lang("ACME服务地址","ACME Service URL",!0)).push(ACME.URL),i(Lang("CSR文本","CSR Text",!0)).push(ACME.StepData.order.orderCSR),i(Lang("证书PEM文本","Certificate PEM Text",!0)).push(a),i(Lang("证书私钥PEM文本","Certificate Private Key PEM Text",!0)).push(e.privateKey.pem),i(Lang("账户私钥PEM文本","Account Private Key PEM Text",!0)).push(e.accountKey.pem),i(Lang("账户URL","Account URL",!0)).push(ACME.StepData.account.url),i(Lang("完整配置信息","Complete Configuration Information",!0)).push("<ACME-HTML-Web-Browser-Client>"+JSON.stringify(o)+"</ACME-HTML-Web-Browser-Client>"),n.push(""),n.push(r),n.push(""),$(".txt_downloadLog").val(t?n.join("\n"):a)},E=function(){$("body").bind("dragover",function(e){e.preventDefault()}).bind("drop",function(e){e.preventDefault();var t=e.dataTransfer.files[0];if(t){var a=new FileReader;a.onload=function(e){var t=a.result,i=/ACME-HTML-Web-Browser-Client>(.+?)<\/ACME-HTML-Web-Browser-Client/.exec(t);if(!i)return Toast(Lang("拖入的文件中未发现配置信息，请拖上次申请证书时保存的记录LOG文件！","No configuration information is found in the dragged file. Please drag the LOG file saved in the last certificate application!"),1);for(var o in n=JSON.parse(i[1]),n.X509)X509[o]=n.X509[o];for(var o in n.Window)window[o]=n.Window[o];CLog("DropConfigFile",0,"Reset Config",n),Toast(Lang("识别到拖入的记录LOG文件，已填充上次申请证书时使用的配置。","The LOG file of the dragged record is identified, and the configuration used in the last certificate application has been filled."),2),r(),downloadFileNameShow()},a.readAsText(t)}})},S="";window.DefaultDownloadFileNames={Cert:"",Key:"",Log:""},window.downloadBtnClick=function(e){var t=$(".txt_download"+e).val(),a=S;"Cert"==e&&(a+=".pem"),"Key"==e&&(a+=".key"),"Log"==e&&(a+=".log"),a=DefaultDownloadFileNames[e]||a;var n=URL.createObjectURL(new Blob([t],{type:"text/plain"})),i=document.createElement("A");i.href=n,i.download="ZSEncrypt_"+a,i.click()},window.downloadFileNameShow=function(e){e=e||"your_domain";var t=(DefaultDownloadFileNames.Cert||"").replace(/\.[^\.]+$/g,"");$(".downloadFileName").html(t||e),$(".downloadKeyFileName").html(DefaultDownloadFileNames.Key||e+".key"),$(".downloadCertFileName").html(DefaultDownloadFileNames.Cert||e+".pem")},window.Test_AllStepData_Save=function(){if(!ACME.StepData.order)throw new Error(Lang("未完成第二步操作","The step 2 is not completed",!0));var e=ACME.StepData.config;delete ACME.PrevNonce,e.privateKey=e.privateKey.pem,e.accountKey=e.accountKey.pem,localStorage[w]=JSON.stringify(ACME),ACME=null,console.warn(Lang("仅供测试：已保存测试数据，需刷新页面","For testing only: the test data has been saved, and the page needs to be refreshed",!0))};var w="ACME_HTML_Test_AllStepData",A=function(){localStorage[w]&&console.warn(Lang("仅供测试：已保存测试数据，调用Test_Restore_StepXXX()进行恢复步骤界面","For testing only: test data has been saved, call Test_Restore_StepXXX() to restore the step interface",!0))},M=function(e){var t=JSON.parse(localStorage[w]||"{}");if(!t.StepData)throw new Error(Lang("未保存数据","No data saved",!0));for(var a in t)ACME[a]=t[a];var n=ACME.StepData.config;X509.KeyParse(n.privateKey,function(t){n.privateKey=t,X509.KeyParse(n.accountKey,function(t){n.accountKey=t,console.log("ACME.StepData",ACME.StepData),setTimeout(function(){e()})})})};window.Test_Restore_StepAuth=function(){M(function(){console.warn(Lang("仅供测试：已手动恢复步骤三界面","For testing only: Step 3 interface has been manually restored",!0)),m()})},window.Test_Restore_StepDownload=function(){M(function(){console.warn(Lang("仅供测试：已手动恢复步骤四界面","For testing only: Step 4 interface has been manually restored",!0)),y()})}})();