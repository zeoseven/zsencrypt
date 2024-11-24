(function(){"use strict";window.ACME={URL:"",SyncID:0,DirData:{},Directory:function(e,t){var n=++ACME.SyncID,r=ACME.URL,o="ACME_HTML_cache_"+r,c=function(a){var r=a.data;if(n!=ACME.SyncID)return t("cancel");var c=r.meta||{};if(!r.newOrder)return t("Not newOrder found: "+FormatText(JSON.stringify(r)));ACME.DirData=r,ACME.StepData.termsURL=c.termsOfService,ACME.StepData.needEAB=!!c.externalAccountRequired;var i=function(){localStorage[o]=JSON.stringify(a)};i(),e(a,i)},i=JSON.parse(localStorage[o]||"{}");if(i.time&&Date.now()-i.time<864e5)return c(i);a(r,null,function(e){c({data:e,time:Date.now()})},t)},StepData:{},ChallName:function(e){return"dns-01"==e.type?Lang("DNS 记录验证"," "):"http-01"==e.type?Lang("文件验证"," "):e.type.toUpperCase()},ChallSort:function(e){return"dns-01"==e.type?"1_"+e.type:"http-01"==e.type?"2_"+e.type:"3_"+e.type},GetJwsA:async function(e,t){var a=ACME.StepData.config.accountKey,n="ES256",r={name:"ECDSA",hash:"SHA-256"};"RSA"==a.type&&(n="RS256",r={name:"RSASSA-PKCS1-v1_5"}),e.alg=n;var o={protected:Json2UrlB64(e),payload:t?Json2UrlB64(t):""},c=Str2Bytes(o.protected+"."+o.payload),i=await crypto.subtle.sign(r,a.key,c);return o.signature=Bytes2UrlB64(i),o},GetNonceA:function(e){return new Promise(function(t,a){ACME.GetNonce(e,function(e){t(e)},function(e){a(new Error(e))})})},GetNonce:function(e,t,n){var r=ACME.PrevNonce;if(ACME.PrevNonce="",!e&&r)return t(r);a({url:ACME.DirData.newNonce,method:"HEAD",response:!1},null,function(e,a){ACME.PrevNonce="";var r=a.getResponseHeader("Replay-Nonce");r?t(r):n("GetNonce: "+Lang("此ACME服务对浏览器访问支持太差，无法跨域获取Replay-Nonce响应头。","This ACME service has too poor browser access support to get the Replay-Nonce response header across domains."),!0)},function(e){n("GetNonce: "+e)})},TestAccountCORS:function(e,t){a({url:ACME.DirData.newAccount,method:"POST",response:!1,nocheck:!0},{},function(a,n){n.status>0?e():t("["+n.status+"]",!0)},function(e){t(e)})},StepAccount:async function(e,t){var a=++ACME.SyncID,n="ACME.StepAccount";CLog(n,0,"==========Account Start==========");var r="";try{await ACME._StepAccountA(a,n)}catch(e){r=e.message||"-",CLog(n,1,r,e)}CLog(n,0,"==========Account End=========="),r?t(r):e()},_StepAccountA:async function(a,n){var r=ACME.DirData.newAccount,o=ACME.StepData.config,c={contact:["mailto:"+o.email],termsOfServiceAgreed:!0};if(ACME.StepData.needEAB){var i={protected:Json2UrlB64({alg:"HS256",kid:o.eabKid,url:r}),payload:Json2UrlB64(X509.PublicKeyJwk(o.accountKey))},s=await crypto.subtle.importKey("raw",UrlB642Bytes(o.eabKey),{name:"HMAC",hash:"SHA-256"},!0,["sign"]),u=Str2Bytes(i.protected+"."+i.payload),A=await crypto.subtle.sign("HMAC",s,u);i.signature=Bytes2UrlB64(A),c.externalAccountBinding=i,CLog(n,0,"externalAccountBinding",i)}var l=await ACME.GetJwsA({jwk:X509.PublicKeyJwk(o.accountKey),nonce:await ACME.GetNonceA(!0),url:r},c),d=await t(r,l);if(a!=ACME.SyncID)throw new Error("cancel");ACME.StepData.account={url:e(d.xhr,"Location"),data:d.data},CLog(n,0,"Account OK",ACME.StepData.account)},StepOrder:async function(e,t,a){var n=++ACME.SyncID,r="ACME.StepOrder";CLog(r,0,"==========Order Start==========");var o="";try{await ACME._StepOrderA(e,n,r)}catch(e){o=e.message||"-",CLog(r,1,o,e)}CLog(r,0,"==========Order End=========="),o?a(o):t()},_StepOrderA:async function(a,n,r){for(var o=ACME.DirData.newOrder,c=ACME.StepData.config,i=[],s=0;s<c.domains.length;s++)i.push({type:"dns",value:c.domains[s]});var u={identifiers:i};a("newOrder...");var A=await ACME.GetJwsA({kid:ACME.StepData.account.url,nonce:await ACME.GetNonceA(),url:o},u),l=await t(o,A);if(n!=ACME.SyncID)throw new Error("cancel");l.data.orderUrl=e(l.xhr,"Location"),ACME.StepData.order=l.data,CLog(r,0,"Order OK",ACME.StepData.order);var d=JSON.stringify(X509.PublicKeyJwk(c.accountKey)),C=await crypto.subtle.digest({name:"SHA-256"},Str2Bytes(d));C=Bytes2UrlB64(C);var p=ACME.StepData.order.identifiers,E=0,S=ACME.StepData.order.authorizations;for(s=0;s<p.length;s++)-1==c.domains.indexOf(p[s].value)&&(E=1);if(E||p.length!=S.length||p.length!=c.domains.length)throw new Error(Lang("创建的订单中的域名和配置的不一致","The domain name in the created order is inconsistent with the configuration"));if(n!=ACME.SyncID)throw new Error("cancel");ACME.StepData.auths={};for(s=0;s<S.length;s++){a("auth("+(s+1)+"/"+S.length+")...");o=S[s],A=await ACME.GetJwsA({kid:ACME.StepData.account.url,nonce:await ACME.GetNonceA(),url:o},""),l=await t(o,A);if(n!=ACME.SyncID)throw new Error("cancel");l.data.domain=p[s].value,l.data.authUrl=o,ACME.StepData.auths[p[s].value]=l.data;for(var w=l.data.challenges,y=0;y<w.length;y++){var f=w[y];f.authTxt=f.token+"."+C;var M=await crypto.subtle.digest({name:"SHA-256"},Str2Bytes(f.authTxt));if(n!=ACME.SyncID)throw new Error("cancel");f.authTxtSHA256=Bytes2UrlB64(M),f.authTxtSHA256Base64=Bytes2Base64(M)}}CLog(r,0,"Order Authorizations",ACME.StepData.auths)},StepVerifyAuthItem:async function(e,t,a,n){var r="ACME.verify["+e.challenges[t].type+"]:"+e.domain,o="";try{await ACME._StepVerifyAuthItemA(e,t,ACME.SyncID,r,a,n)}catch(e){o=e.message||"-",CLog(r,1,o,e)}o&&a(!1,1e3,o)},_StepVerifyAuthItemA:async function(e,a,n,r,o,c){var i=e.challenges[a];if(!i.isSend){var s=i.url,u=await ACME.GetJwsA({kid:ACME.StepData.account.url,nonce:await ACME.GetNonceA(),url:s},{}),A=await t({url:s,nocheck:!0},u),l=A.xhr.status;l>=200&&l<300&&(i.isSend=!0)}s=e.authUrl,u=await ACME.GetJwsA({kid:ACME.StepData.account.url,nonce:await ACME.GetNonceA(),url:s},""),A=await t(s,u);var d=A.data;return"pending"==d.status?(CLog(r,0,"pending..."),o(!1,1e3,"pending...")):"valid"==d.status?(CLog(r,0,"valid OK"),o(!0)):(CLog(r,1,"Fail",d),c(d.status+": "+FormatText(JSON.stringify(d))))},StepFinalizeOrder:async function(e,t,a){var n=++ACME.SyncID,r="ACME.StepFinalizeOrder";CLog(r,0,"==========Finalize Start==========");var o="";try{await ACME._StepFinalizeOrderA(e,n,r)}catch(e){o=e.message||"-",CLog(r,1,o,e)}CLog(r,0,"==========Finalize End=========="),o?a(o):t()},_StepFinalizeOrderA:async function(e,a,n){var r=ACME.StepData.order,o=ACME.StepData.config,c=o.domains;if(!r.finalizeIsSend){e("finalize...");var i=await new Promise(function(e,t){X509.CreateCSR(o.privateKey,c[0],c,function(t){e(t)},function(e){t(new Error(e))})});r.orderCSR=i,CLog(n,0,"CSR\n"+i),i=Bytes2UrlB64(ASN1.PEM2Bytes(i));var s=r.finalize,u=await ACME.GetJwsA({kid:ACME.StepData.account.url,nonce:await ACME.GetNonceA(),url:s},{csr:i}),A=await t(s,u);if(a!=ACME.SyncID)throw new Error("cancel");CLog(n,0,"finalize result",A.data),r.finalizeIsSend=!0}for(var l=Date.now(),d=0;!r.checkOK&&Date.now()-l<6e4;){if(a!=ACME.SyncID)throw new Error("cancel");d++,e("check retry:"+d+"...");s=r.orderUrl,u=await ACME.GetJwsA({kid:ACME.StepData.account.url,nonce:await ACME.GetNonceA(),url:s},""),A=await t(s,u);if(a!=ACME.SyncID)throw new Error("cancel");var C=A.data;if("valid"==C.status){r.checkOK=!0,r.certUrl=C.certificate,CLog(n,0,"check OK",C);break}if("invalid"==C.status)throw CLog(n,1,"check Fail",C),new Error(C.status+": "+FormatText(JSON.stringify(C)));CLog(n,0,C.status+"... wait 1s",C),await new Promise(function(e){setTimeout(e,1e3)})}if(!r.downloadPEM){e("download...");s=r.certUrl,u=await ACME.GetJwsA({kid:ACME.StepData.account.url,nonce:await ACME.GetNonceA(),url:s},""),A=await t({url:s,response:!1},u);if(a!=ACME.SyncID)throw new Error("cancel");var p=A.xhr.responseText;r.downloadPEM=p,CLog(n,0,"download OK\n"+p)}}};var e=function(e,t){var a=e.getResponseHeader(t);if(!a)throw acmeReadDirGotoCORS(),new Error(Lang("无法读取响应头"+t+"，可能是因为此ACME服务对跨域访问支持不良，请按第一步显示的提示操作。","The response header "+t+" cannot be read, This may be because this ACME service does not support cross domain access, Please follow the prompt displayed in step 1."));return a},t=function(e,t){return new Promise(function(n,r){a(e,t,function(e,t){n({data:e,xhr:t})},function(e){r(new Error(e))})})},a=function(e,t,a,n){var r="string"==typeof e?{url:e}:e;e=r.url;var o=r.method||(t?"POST":"GET"),c="ACME.Request";CLog(c,4,"send "+o,r,t);var i=new XMLHttpRequest;i.timeout=3e4,i.open(o,e,!0),i.onreadystatechange=function(){if(4==i.readyState){ACME.PrevNonce=i.getResponseHeader("Replay-Nonce")||"";var e,t,o=i.status<200||i.status>=300,s=null==r.response||r.response;if(s||o){t=i.responseText;try{e=JSON.parse(t),t=e}catch(e){}}if(CLog(c,4,"send End",r,{status:i.status,headers:i.getAllResponseHeaders()},t),r.nocheck||!o&&(!s||e))return a(e,i);n((o?"["+i.status+"]":"")+FormatText(i.responseText),i.status)}},t?("object"==typeof t&&(t=JSON.stringify(t)),i.setRequestHeader("Content-Type",r.contentType||"application/jose+json"),i.send(t)):i.send()}})();