//===================================================
//================= ACME functions ==================
//===================================================
//LICENSE: GPL-3.0, https://github.com/xiangyuecn/ACME-HTML-Web-Browser-Client

(function () {
    "use strict";

    /************** ACME client implementation **************/
    //RFC8555: https://www.rfc-editor.org/rfc/rfc8555.html
    window.ACME = {
        URL: ""
        , SyncID: 0
        , DirData: {}
        , Directory: function (True, False) {
            var id = ++ACME.SyncID;
            var url = ACME.URL, dirStoreKey = "ACME_HTML_cache_" + url;
            var ok = function (cache) {
                var data = cache.data;
                if (id != ACME.SyncID) return False("cancel");
                var meta = data.meta || {};
                if (!data.newOrder)
                    return False("Not newOrder found: " + FormatText(JSON.stringify(data)));
                ACME.DirData = data;
                ACME.StepData.termsURL = meta.termsOfService;
                ACME.StepData.needEAB = !!meta.externalAccountRequired;
                var saveCache = function () {
                    localStorage[dirStoreKey] = JSON.stringify(cache);
                };
                saveCache();
                True(cache, saveCache);
            };
            var cache = JSON.parse(localStorage[dirStoreKey] || '{}');//先读缓存
            if (cache.time && Date.now() - cache.time < 24 * 60 * 60 * 1000) {
                return ok(cache);
            }
            request(url, null, function (data) {
                ok({ data: data, time: Date.now() });
            }, False);
        }

        , StepData: {}
        , ChallName: function (chall) { //验证类型名称
            if (chall.type == "dns-01") { // https://letsencrypt.org/docs/challenge-types/
                return Lang("DNS 记录验证", " ");
            } else if (chall.type == "http-01") {
                return Lang("文件验证", " ");
            } // tls-alpn-01 https://www.rfc-editor.org/rfc/rfc8737
            return chall.type.toUpperCase();
        }
        , ChallSort: function (chall) { //验证类型排序
            if (chall.type == "dns-01") return 1 + "_" + chall.type;
            else if (chall.type == "http-01") return 2 + "_" + chall.type;
            return 3 + "_" + chall.type;
        }
        // 生成JSON Web Signature(JWS)，用账户私钥签名
        , GetJwsA: async function (Protected, Payload) {
            var key = ACME.StepData.config.accountKey;
            var alg = "ES256", algorithm = { name: "ECDSA", hash: "SHA-256" };
            if (key.type == "RSA") {
                alg = "RS256"; algorithm = { name: "RSASSA-PKCS1-v1_5" }
            }
            Protected.alg = alg;
            var rtv = {
                "protected": Json2UrlB64(Protected)
                , payload: Payload ? Json2UrlB64(Payload) : ""
            };
            var data = Str2Bytes(rtv["protected"] + "." + rtv.payload);
            var sign = await crypto.subtle.sign(algorithm, key.key, data);
            rtv.signature = Bytes2UrlB64(sign);
            return rtv;
        }
        // 获得随机数Nonce
        , GetNonceA: function (useNew) {
            return new Promise(function (resolve, reject) {
                ACME.GetNonce(useNew, function (val) {
                    resolve(val);
                }, function (err) {
                    reject(new Error(err));
                });
            });
        }
        , GetNonce: function (useNew, True, False) {
            var old = ACME.PrevNonce; ACME.PrevNonce = "";
            if (!useNew && old) return True(old);//使用上次调用返回的值
            request({
                url: ACME.DirData.newNonce
                , method: "HEAD", response: false
            }, null, function (data, xhr) {
                ACME.PrevNonce = "";
                //跨域无解 Chrome ZeroSSL: Refused to get unsafe header "Replay-Nonce" , 需要 Access-Control-Expose-Headers: Link, Replay-Nonce, Location
                var val = xhr.getResponseHeader("Replay-Nonce");
                if (!val) {
                    False("GetNonce: " + Lang('此ACME服务对浏览器访问支持太差，无法跨域获取Replay-Nonce响应头。', 'This ACME service has too poor browser access support to get the Replay-Nonce response header across domains.'), true);
                    return;
                }
                True(val);
            }, function (err) {
                False("GetNonce: " + err);
            });
        }
        //测试账户接口的跨域访问
        , TestAccountCORS: function (True, False) {
            request({
                url: ACME.DirData.newAccount
                , method: "POST", response: false, nocheck: true
            }, {}, function (data, xhr) {
                if (xhr.status > 0) {
                    True();
                } else {
                    False("[" + xhr.status + "]", true);
                }
            }, function (err) {
                False(err);
            });
        }

        //账户接口调用
        , StepAccount: async function (True, False) {
            var id = ++ACME.SyncID;
            var tag = "ACME.StepAccount";
            CLog(tag, 0, "==========Account Start==========");
            var Err = "";
            try {
                await ACME._StepAccountA(id, tag);
            } catch (e) {
                Err = e.message || "-";
                CLog(tag, 1, Err, e);
            }
            CLog(tag, 0, "==========Account End==========");
            if (Err) False(Err)
            else True();
        }, _StepAccountA: async function (id, tag) {
            var url = ACME.DirData.newAccount, config = ACME.StepData.config;
            var accountData = {
                contact: ["mailto:" + config.email]
                , termsOfServiceAgreed: true
            };

            //externalAccountRequired https://github.com/fszlin/certes/blob/08bf850bbed9e026c718f56f1bcc454afafb4f92/src/Certes/Acme/AccountContext.cs
            if (ACME.StepData.needEAB) {
                var eab = {
                    "protected": Json2UrlB64({ alg: "HS256", kid: config.eabKid, url: url })
                    , payload: Json2UrlB64(X509.PublicKeyJwk(config.accountKey))
                };
                var key = await crypto.subtle.importKey("raw", UrlB642Bytes(config.eabKey)
                    , { name: "HMAC", hash: "SHA-256" }, true, ["sign"]);
                var data = Str2Bytes(eab["protected"] + "." + eab.payload);
                var sign = await crypto.subtle.sign("HMAC", key, data);
                eab.signature = Bytes2UrlB64(sign);
                accountData.externalAccountBinding = eab;
                CLog(tag, 0, "externalAccountBinding", eab);
            };

            //组装成jws，请求接口
            var sendData = await ACME.GetJwsA({
                jwk: X509.PublicKeyJwk(config.accountKey)
                , nonce: await ACME.GetNonceA(true)
                , url: url
            }, accountData);
            var resp = await requestA(url, sendData);
            if (id != ACME.SyncID) throw new Error("cancel");
            ACME.StepData.account = {
                url: xhrHeader(resp.xhr, "Location")
                , data: resp.data
            };
            CLog(tag, 0, "Account OK", ACME.StepData.account);
        }

        //订单接口调用
        , StepOrder: async function (Progress, True, False) {
            var id = ++ACME.SyncID;
            var tag = "ACME.StepOrder";
            CLog(tag, 0, "==========Order Start==========");
            var Err = "";
            try {
                await ACME._StepOrderA(Progress, id, tag);
            } catch (e) {
                Err = e.message || "-";
                CLog(tag, 1, Err, e);
            }
            CLog(tag, 0, "==========Order End==========");
            if (Err) False(Err)
            else True();
        }, _StepOrderA: async function (Progress, id, tag) {
            var url = ACME.DirData.newOrder, config = ACME.StepData.config;
            var dnsArr = [];
            for (var i = 0; i < config.domains.length; i++) {
                dnsArr.push({ type: "dns", value: config.domains[i] });
            }
            var orderData = {
                identifiers: dnsArr
            };

            Progress("newOrder...");
            //组装成jws，请求接口
            var sendData = await ACME.GetJwsA({
                kid: ACME.StepData.account.url
                , nonce: await ACME.GetNonceA()
                , url: url
            }, orderData);
            var resp = await requestA(url, sendData);
            if (id != ACME.SyncID) throw new Error("cancel");
            resp.data.orderUrl = xhrHeader(resp.xhr, "Location");
            ACME.StepData.order = resp.data;
            CLog(tag, 0, "Order OK", ACME.StepData.order);

            //准备Key Authorizations需要的参数 参考：rfc8555 8.1
            var jwkStr = JSON.stringify(X509.PublicKeyJwk(config.accountKey));
            var thumbprint = await crypto.subtle.digest({ name: "SHA-256" }, Str2Bytes(jwkStr));
            thumbprint = Bytes2UrlB64(thumbprint);

            //读取所有的验证信息
            var idfs = ACME.StepData.order.identifiers, bad = 0;
            var auths = ACME.StepData.order.authorizations;
            for (var i = 0; i < idfs.length; i++) {
                if (config.domains.indexOf(idfs[i].value) == -1) bad = 1;
            }
            if (bad || idfs.length != auths.length || idfs.length != config.domains.length)
                throw new Error(Lang("创建的订单中的域名和配置的不一致", "The domain name in the created order is inconsistent with the configuration"));
            if (id != ACME.SyncID) throw new Error("cancel");
            ACME.StepData.auths = {};
            for (var i = 0; i < auths.length; i++) {
                Progress("auth(" + (i + 1) + "/" + auths.length + ")...");
                var url = auths[i];
                var sendData = await ACME.GetJwsA({
                    kid: ACME.StepData.account.url
                    , nonce: await ACME.GetNonceA()
                    , url: url
                }, "");
                var resp = await requestA(url, sendData);
                if (id != ACME.SyncID) throw new Error("cancel");
                resp.data.domain = idfs[i].value;
                resp.data.authUrl = url;
                ACME.StepData.auths[idfs[i].value] = resp.data;

                //生成Key Authorizations
                var challs = resp.data.challenges;
                for (var i2 = 0; i2 < challs.length; i2++) {
                    var chall = challs[i2];
                    chall.authTxt = chall.token + "." + thumbprint;
                    var sha = await crypto.subtle.digest({ name: "SHA-256" }
                        , Str2Bytes(chall.authTxt));
                    if (id != ACME.SyncID) throw new Error("cancel");
                    chall.authTxtSHA256 = Bytes2UrlB64(sha);
                    chall.authTxtSHA256Base64 = Bytes2Base64(sha);
                }
            }
            CLog(tag, 0, "Order Authorizations", ACME.StepData.auths);
        }

        //验证一个域名
        , StepVerifyAuthItem: async function (authItem, challIdx, True, False) {
            var tag = "ACME.verify[" + authItem.challenges[challIdx].type + "]:" + authItem.domain;
            var Err = "";
            try {
                await ACME._StepVerifyAuthItemA(authItem, challIdx, ACME.SyncID, tag, True, False);
            } catch (e) {
                Err = e.message || "-";
                CLog(tag, 1, Err, e);
            }
            if (Err) True(false, 1000, Err); //重试
        }, _StepVerifyAuthItemA: async function (authItem, challIdx, id, tag, True, False) {
            //先通知要用的验证方式，反复发送只要成功一次即可，不管结果
            var chall = authItem.challenges[challIdx];
            if (!chall.isSend) {
                var url = chall.url;
                var sendData = await ACME.GetJwsA({
                    kid: ACME.StepData.account.url
                    , nonce: await ACME.GetNonceA()
                    , url: url
                }, {});
                var resp = await requestA({ url: url, nocheck: true }, sendData);
                var status = resp.xhr.status;
                if (status >= 200 && status < 300)
                    chall.isSend = true;
            }

            //重新查询一下状态
            var url = authItem.authUrl;
            var sendData = await ACME.GetJwsA({
                kid: ACME.StepData.account.url
                , nonce: await ACME.GetNonceA()
                , url: url
            }, "");
            var resp = await requestA(url, sendData);
            var data = resp.data;
            if (data.status == "pending") {
                CLog(tag, 0, "pending...");
                return True(false, 1000, "pending...");
            }
            if (data.status == "valid") {
                CLog(tag, 0, "valid OK");
                return True(true);
            }
            CLog(tag, 1, "Fail", data);
            return False(data.status + ": " + FormatText(JSON.stringify(data)));
        }

        //完成订单，生成证书
        , StepFinalizeOrder: async function (Progress, True, False) {
            var id = ++ACME.SyncID;
            var tag = "ACME.StepFinalizeOrder";
            CLog(tag, 0, "==========Finalize Start==========");
            var Err = "";
            try {
                await ACME._StepFinalizeOrderA(Progress, id, tag);
            } catch (e) {
                Err = e.message || "-";
                CLog(tag, 1, Err, e);
            }
            CLog(tag, 0, "==========Finalize End==========");
            if (Err) False(Err)
            else True();
        }, _StepFinalizeOrderA: async function (Progress, id, tag) {
            var order = ACME.StepData.order, config = ACME.StepData.config, domains = config.domains;

            //先请求finalize
            if (!order.finalizeIsSend) {
                Progress("finalize...");
                //生成csr，第一个域名做CN
                var csr = await new Promise(function (resolve, reject) {
                    X509.CreateCSR(config.privateKey, domains[0], domains, function (csr) {
                        resolve(csr);
                    }, function (err) {
                        reject(new Error(err));
                    });
                });
                order.orderCSR = csr;
                CLog(tag, 0, "CSR\n" + csr);
                csr = Bytes2UrlB64(ASN1.PEM2Bytes(csr));

                var url = order.finalize;
                //组装成jws，请求接口
                var sendData = await ACME.GetJwsA({
                    kid: ACME.StepData.account.url
                    , nonce: await ACME.GetNonceA()
                    , url: url
                }, { csr: csr });
                var resp = await requestA(url, sendData);
                if (id != ACME.SyncID) throw new Error("cancel");
                CLog(tag, 0, "finalize result", resp.data);
                order.finalizeIsSend = true;
            }

            //轮询订单状态，60秒超时
            var t1 = Date.now(), tryCount = 0;
            while (!order.checkOK && Date.now() - t1 < 60 * 1000) {
                if (id != ACME.SyncID) throw new Error("cancel");
                tryCount++;
                Progress("check retry:" + tryCount + "...");
                var url = order.orderUrl;
                //组装成jws，请求接口
                var sendData = await ACME.GetJwsA({
                    kid: ACME.StepData.account.url
                    , nonce: await ACME.GetNonceA()
                    , url: url
                }, "");
                var resp = await requestA(url, sendData);
                if (id != ACME.SyncID) throw new Error("cancel");
                var data = resp.data;
                if (data.status == "valid") {
                    order.checkOK = true;
                    order.certUrl = data.certificate;
                    CLog(tag, 0, "check OK", data);
                    break;
                } else if (data.status == "invalid") {
                    CLog(tag, 1, "check Fail", data);
                    throw new Error(data.status + ": " + FormatText(JSON.stringify(data)));
                } else {
                    CLog(tag, 0, data.status + "... wait 1s", data);
                    await new Promise(function (s) { setTimeout(s, 1000) });
                }
            }

            //下载证书
            if (!order.downloadPEM) {
                Progress("download...");
                var url = order.certUrl;
                //组装成jws，请求接口
                var sendData = await ACME.GetJwsA({
                    kid: ACME.StepData.account.url
                    , nonce: await ACME.GetNonceA()
                    , url: url
                }, "");
                var resp = await requestA({ url: url, response: false }, sendData);
                if (id != ACME.SyncID) throw new Error("cancel");
                var pem = resp.xhr.responseText;
                order.downloadPEM = pem;
                CLog(tag, 0, "download OK\n" + pem);
            }
        }
    };


    // 读取响应头，读不到就当做跨域无法读取处理，自定义的头需要 Access-Control-Expose-Headers: Link, Replay-Nonce, Location
    var xhrHeader = function (xhr, key) {
        var val = xhr.getResponseHeader(key);
        if (!val) {
            acmeReadDirGotoCORS();
            throw new Error(Lang("无法读取响应头" + key + "，可能是因为此ACME服务对跨域访问支持不良，请按第一步显示的提示操作。"
                , "The response header " + key + " cannot be read, This may be because this ACME service does not support cross domain access, Please follow the prompt displayed in step 1."));
        }
        return val;
    };

    // ajax
    var requestA = function (url, post) {
        return new Promise(function (resolve, reject) {
            request(url, post, function (data, xhr) {
                resolve({ data: data, xhr: xhr });
            }, function (err) {
                reject(new Error(err));
            });
        });
    }
    var request = function (url, post, True, False) {
        var set = typeof (url) == "string" ? { url: url } : url; url = set.url;
        var method = set.method || (post ? "POST" : "GET");
        var tag = "ACME.Request"; CLog(tag, 4, "send " + method, set, post);

        var xhr = new XMLHttpRequest();
        xhr.timeout = 30000;
        xhr.open(method, url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                ACME.PrevNonce = xhr.getResponseHeader("Replay-Nonce") || "";//将此值存起来

                var isBad = xhr.status < 200 || xhr.status >= 300;
                var useResp = set.response == null || set.response;
                var err = "", data, logObj;
                if (useResp || isBad) {
                    logObj = xhr.responseText;
                    try {
                        data = JSON.parse(logObj);
                        logObj = data;
                    } catch (e) { };
                }
                CLog(tag, 4, "send End", set, {
                    status: xhr.status
                    , headers: xhr.getAllResponseHeaders()
                }, logObj);
                if (set.nocheck || !isBad && (!useResp || data)) {
                    return True(data, xhr);
                }
                False((isBad ? "[" + xhr.status + "]" : "") + FormatText(xhr.responseText), xhr.status);
            }
        };
        if (post) {
            if (typeof (post) == "object") post = JSON.stringify(post);
            xhr.setRequestHeader("Content-Type", set.contentType || "application/jose+json");
            xhr.send(post);
        } else {
            xhr.send();
        }
    };

})();







































//==================================================================
//================= RSA/ECC/X.509/ASN.1 functions ==================
//==================================================================
//LICENSE: GPL-3.0, https://github.com/xiangyuecn/ACME-HTML-Web-Browser-Client

(function () {
    "use strict";

    window.X509 = {
        DefaultType2_RSA: "2048" //默认创建RSA密钥位数
        , DefaultType2_ECC: "P-256" //默认创建ECC曲线
        , SupportECCType2: { //支持的ECC曲线和常见名称
            "P-256": "prime256v1", "P-384": "secp384r1", "P-521": "secp521r1"
        }
        , SupportECCType2Names: function () { var str = []; for (var k in X509.SupportECCType2) str.push(X509.SupportECCType2[k]); return str; }

        //创建RSA/ECC密钥对 type2取值：type=RSA时为密钥位数数值，type=ECC时为支持的曲线（X509.SupportECCType2）
        , KeyGenerate: function (type, type2, True, False) {
            var algorithm = 0;
            if (type == "RSA") {
                algorithm = {
                    publicExponent: new Uint8Array([1, 0, 1]) //E: AQAB
                    , name: "RSASSA-PKCS1-v1_5", modulusLength: +type2, hash: "SHA-256"
                };
            } else if (type == "ECC") {
                algorithm = { name: "ECDSA", namedCurve: type2 };
            } else {
                False("Not support " + type);
                return;
            };
            crypto.subtle.generateKey(algorithm, true, ["sign", "verify"])
                .then(function (key) {
                    //FireFox不支持导出pkcs8参数的ECC私钥，Chrome没问题，使用jwk获得最大兼容
                    crypto.subtle.exportKey("jwk", key.privateKey).then(function (jwk) {
                        True(X509.KeyExport(jwk));
                    }).catch(function (e) {
                        False(Lang('此浏览器不支持导出' + algorithm.name + '+PKCS#8格式密钥：', 'This browser does not support exporting ' + algorithm.name + '+PKCS#8 format keys: ') + e.message);
                    });
                }).catch(function (e) {
                    False(Lang('此浏览器不支持生成' + algorithm.name + '：', 'This browser does not support generating ' + algorithm.name + ': ') + e.message);
                });
        }
        //解析密钥，检查是否支持，通过回调返回格式或错误信息，pem支持公钥和私钥
        , KeyParse: function (pem, True, False, mustPrivate) {
            var rtv = {};
            var Err = function (msg) { rtv.error = msg; False(msg, rtv); };
            //浏览器crypto不支持PKCS#1的pem导入，提取参数转成jwk导入

            if (!/BEGIN\s*(RSA|EC)?\s*(PUBLIC|PRIVATE)\s*KEY/.test(pem))
                return Err(Lang('不是RSA或ECC密钥', 'Not an RSA or ECC key'));
            rtv.type = RegExp.$1 == "EC" ? "ECC" : RegExp.$1;
            var isPKCS1 = !!RegExp.$1;
            var isPub = RegExp.$2 == "PUBLIC";
            if (isPub && mustPrivate)
                return Err(Lang('不是私钥', 'Is not a private key'));

            //解析提取参数信息
            try {
                var paramAsn1 = null;
                var asn1 = ASN1.ParsePEM(pem);
                rtv.asn1 = asn1;

                if (isPKCS1) {
                    if (rtv.type == "RSA") {
                        paramAsn1 = asn1; //直接按顺序存放的参数
                    } else if (rtv.type == "ECC") {
                        if (isPub) //没见过这种ecc公钥
                            return Err(Lang('不支持ECC PKCS#1格式公钥', 'ECC PKCS#1 format public key is not supported'));
                        var oid2 = asn1.sub[2].sub[0].oid;
                        rtv.type2 = ASN1.OID[oid2] || "";
                        paramAsn1 = asn1;
                    }
                } else {
                    var idx = isPub ? 0 : 1; //跳过私钥开头的version，就和公钥一样了
                    var oid = asn1.sub[idx].sub[0].oid;
                    var oid2 = asn1.sub[idx].sub[1].oid;
                    rtv.type = ASN1.OID[oid] || "";
                    rtv.type2 = ASN1.OID[oid2] || "";

                    if (rtv.type == "ECC" && isPub)//ECC公钥直接就是值
                        paramAsn1 = asn1;
                    else
                        paramAsn1 = new ASN1().parse(asn1.sub[idx + 1].bytes);//密钥参数
                }
                rtv.paramAsn1 = paramAsn1;
            } catch (e) {
                return Err(Lang('密钥解析失败：', 'Key resolution failed: ') + e.message);
            }
            if (rtv.type == "RSA") {
                var idx = isPub ? 0 : 1; //私钥开头多一个版本号
                rtv.param = {
                    n: paramAsn1.sub[idx].bytes //Modulus
                    , e: paramAsn1.sub[idx + 1].bytes //Exponent
                    , d: isPub ? null : paramAsn1.sub[idx + 2].bytes //D
                };
                var keys = "p,q,dp,dq,qi".split(",");
                for (var i = 0; i < 5; i++)
                    rtv.param[keys[i]] = isPub ? null : paramAsn1.sub[idx + 3 + i].bytes;
                rtv.type2 = rtv.param.n.length * 8 + "";
            } else if (rtv.type == "ECC") {
                if (!X509.SupportECCType2[rtv.type2]) {
                    return Err(Lang('只支持' + X509.SupportECCType2Names().join("、") + '曲线的ECC密钥', 'ECC key only supported for ' + X509.SupportECCType2Names().join(",") + ' curve'));
                }
                if (isPub) {
                    var b2 = paramAsn1.sub[1].bytes;
                } else {
                    var idx = isPKCS1 ? 3 : 2;
                    var b2 = paramAsn1.sub[idx].sub[0].bytes;
                }
                if (b2[0] != 0x04)//0x04代表公钥未压缩 https://www.rfc-editor.org/rfc/rfc5480#section-2.2
                    return Err("ECC !0x04: " + b2[0]);
                var bits = (b2.length - 1) / 2;
                rtv.param = {
                    x: b2.slice(1, 1 + bits) //xy为公钥
                    , y: b2.slice(1 + bits)
                    , d: isPub ? null : paramAsn1.sub[1].bytes //D
                };
            } else {
                return Err(Lang('不支持的密钥类型：', 'Unsupported key type: ') + oid);
            }
            rtv.isPKCS1 = isPKCS1;
            rtv.hasPrivate = !isPub;
            rtv.pem = pem;

            //转成CryptoKey
            var algorithm, jwk;
            if (rtv.type == "RSA") {
                algorithm = {
                    publicExponent: new Uint8Array(rtv.param.n.buffer)
                    , name: "RSASSA-PKCS1-v1_5", modulusLength: +rtv.type2, hash: "SHA-256"
                };
                jwk = { kty: "RSA", alg: "RS256" };
            } else if (rtv.type == "ECC") {
                algorithm = { name: "ECDSA", namedCurve: rtv.type2 };
                jwk = { kty: "EC", crv: rtv.type2 };
            }
            jwk = Object.assign(jwk, { ext: true, key_ops: [isPub ? "verify" : "sign"] });
            for (var k in rtv.param)
                rtv.param[k] && (jwk[k] = Bytes2UrlB64(rtv.param[k]));

            crypto.subtle.importKey(
                "jwk", jwk, algorithm, true, [isPub ? "verify" : "sign"]
            ).then(function (key) {
                rtv.key = key;
                True(rtv);
            }).catch(function (e) {
                Err(Lang('密钥转成CryptoKey失败：', 'Failed to convert key to CryptoKey: ') + e.message);
            });
        }
        //解析出来的公钥转换成JSON Web Key(JWK)
        , PublicKeyJwk: function (info) { // https://www.rfc-editor.org/rfc/rfc7638
            var p = info.param;
            if (info.type == "RSA") {
                return { e: Bytes2UrlB64(p.e), kty: "RSA", n: Bytes2UrlB64(p.n) };
            } else if (info.type == "ECC") {
                return { crv: info.type2, kty: "EC", x: Bytes2UrlB64(p.x), y: Bytes2UrlB64(p.y) };
            } else {
                throw new Error("Jwk: " + info.type);
            }
        }
        //解析出来的密钥或jwk对象转成PKCS#8格式 publicOnly：提供私钥时仅导出公钥 returnType：1 bytes，2 asn1，other pem
        , KeyExport: function (info, publicOnly, returnType) {
            var tag = "KeyExport: ", S = ASN1.S, V = ASN1.V; //ASN1快捷创建方式
            var param = info.param, type = param && info.type, type2 = info.type2;//解析出来的格式
            if (!param) {//jwk
                if (info.kty) {
                    type = info.kty == "EC" ? "ECC" : info.kty;
                    if (type == "ECC") type2 = info.crv;
                } else throw new Error(tag + "bad key");
            }
            var keys = (type == "ECC" ? "x,y,d" : "n,e,d,p,q,dp,dq,qi").split(",");
            if (!param) {//jwk参数需转成二进制
                param = {};
                for (var i = 0; i < keys.length; i++) {
                    var k = keys[i], b64 = info[k];
                    if (b64) param[k] = UrlB642Bytes(b64);
                }
            }
            var useD = !publicOnly && param.d;//导出私钥

            var bytes;//封装参数
            if (type == "RSA") {
                var asn1 = S(0x30, V(0x02, param.n), V(0x02, param.e));
                if (useD) {//公钥只需n、e参数，私钥要全部
                    asn1.sub.splice(0, 0, V(0x02, [0]));//开头插入版本号
                    for (var i = 2; i < keys.length; i++) {
                        asn1.push(V(0x02, param[keys[i]]));
                    }
                }
                bytes = asn1.toBytes();
            } else if (type == "ECC") { //公钥x、y参数，私钥外面再套一层d
                var pubB = new Uint8Array(1 + param.x.length * 2); pubB[0] = 0x04;
                pubB.set(param.x, 1);
                pubB.set(param.y, 1 + param.x.length);
                if (useD) {
                    bytes = S(0x30, V(0x02, [1]), V(0x04, param.d)
                        , S(0xA1, V(0x03, pubB))).toBytes();
                } else bytes = pubB;
            } else { throw new Error(tag + type); }

            var typeASN1 = S(0x30 //封装类型
                , V(0x06, ASN1.OID2Bytes(ASN1.OID[type]))
                , type == "RSA" ? V(0x05, [])
                    : V(0x06, ASN1.OID2Bytes(ASN1.OID[type2]))
            );

            if (useD) {//封装私钥
                var keyA = S(0x30, V(0x02, [0]), typeASN1, V(0x04, bytes));
            } else { //封装公钥
                var keyA = S(0x30, typeASN1, V(0x03, bytes));
            };
            if (returnType == 2) return keyA;
            bytes = keyA.toBytes();
            if (returnType == 1) return bytes;
            var str = Bytes2Base64(bytes).replace(/(.{64})/g, "$1\n").trim();
            var sp = useD ? "PRIVATE" : "PUBLIC";
            return '-----BEGIN ' + sp + ' KEY-----\n' + str + '\n-----END ' + sp + ' KEY-----';
        }


        //创建证书请求CSR，提供私钥用于CSR签名
        , CreateCSR: function (keyInfo, commonName, domains, True, False) {
            //CSR格式：rfc2986，太复杂了，直接拿openssl生成csr用ASN1.ParsePEM来观看格式
            var S = ASN1.S, V = ASN1.V; //ASN1快捷创建方式

            //封装公钥
            try {
                var pubA = X509.KeyExport(keyInfo, true, 2);
            } catch (e) { return False(e.message) }

            //封装域名列表扩展属性
            var altNameA = S(0x30);
            for (var i = 0; i < domains.length; i++)
                altNameA.push(V(0x82, Str2Bytes(domains[i])));

            //组装CSR主体
            var bodyA = S(0x30
                , V(0x02, [0]) //版本号 固定值0
                , S(0x30, S(0x31, S(0x30 //只提供一个属性：CN
                    , V(0x06, ASN1.OID2Bytes("2.5.4.3"))
                    , V(0x0C, Str2Bytes(commonName))
                )))
                , pubA //公钥
                , S(0xA0, S(0x30 //扩展属性，域名列表
                    , V(0x06, ASN1.OID2Bytes("1.2.840.113549.1.9.14"))
                    , S(0x31, S(0x30, S(0x30
                        , V(0x06, ASN1.OID2Bytes("2.5.29.17"))
                        , V(0x04, altNameA.toBytes())
                    )))
                ))
            );

            //签名生成CSR rfc2315
            var bodyBytes = bodyA.toBytes();
            var algorithm = { name: "ECDSA", hash: "SHA-256" };
            if (keyInfo.type == "RSA") {
                algorithm = { name: "RSASSA-PKCS1-v1_5" }
            }
            crypto.subtle.sign(algorithm, keyInfo.key, bodyBytes).then(function (arr) {
                var signBytes = new Uint8Array(arr);
                if (keyInfo.type == "ECC") {//ECC分两段重新封装一下
                    var s1 = signBytes.subarray(0, keyInfo.param.x.length);
                    var s2 = signBytes.subarray(keyInfo.param.x.length);
                    signBytes = S(0x30, V(0x02, s1), V(0x02, s2)).toBytes();
                }
                var csrA = S(0x30, bodyA
                    , S(0x30 //签名类型
                        , V(0x06, ASN1.OID2Bytes(ASN1.OID["SHA256_" + keyInfo.type]))
                        , keyInfo.type == "RSA" ? V(0x05, []) : null //ECC没有第二个参数
                    )
                    , V(0x03, signBytes)
                );
                var bytes = csrA.toBytes();
                var str = Bytes2Base64(bytes).replace(/(.{64})/g, "$1\n").trim();
                True('-----BEGIN CERTIFICATE REQUEST-----\n' + str + '\n-----END CERTIFICATE REQUEST-----');
            }).catch(function (e) {
                False("CSR sign:" + e.message);
            });
        }
    };



    //简单实现ASN.1解析和封包
    window.ASN1 = function (tag, bytes) {
        this.sub = [];
        if (tag) this.setTag(tag);
        if (bytes) this.setBytes(bytes);
    };
    ASN1.S = function (tag) { //快捷创建容器类型，并提供任意多个子元素
        var v = new ASN1(tag);
        for (var i = 1, a = arguments; i < a.length; i++) { a[i] && v.push(a[i]) }
        return v;
    };
    ASN1.V = function (tag, bytes) { //快捷创建值类型
        return new ASN1(tag, bytes)
    };
    ASN1.ParsePEM = function (pem) {
        return new ASN1().parsePEM(pem);
    };
    ASN1.TagNames = {
        '01': 'BOOLEAN', '02': 'INTEGER', '03': 'BIT_STRING'
        , '04': 'OCTET_STRING', '05': 'NULL', '06': 'OID'
        , '0C': 'UTF8String', '13': 'Printable_String'
        , '17': 'UTCTime', '18': 'GeneralizedTime', '30': 'SEQUENCE', '31': 'SET'
    };
    ASN1.OID = {
        "1.2.840.113549.1.1.1": "RSA"
        , "1.2.840.113549.1.1.11": "SHA256_RSA"
        , "1.2.840.10045.2.1": "ECC"
        , "1.2.840.10045.4.3.2": "SHA256_ECC"
        , "1.2.840.10045.3.1.7": "P-256" //secp256r1 | prime256v1
        , "1.3.132.0.34": "P-384" //secp384r1
        , "1.3.132.0.35": "P-521" //secp521r1
    }; for (var k in ASN1.OID) ASN1.OID[ASN1.OID[k]] = k;
    ASN1.OID2Bytes = function (oid) {
        var arr = oid.split('.'), byts = [];
        var v0 = +arr[0], v1 = +arr[1];
        if (!/^[\d\.]+$/.test(oid) || arr.length < 3 || v0 > 2 || v0 * 40 + v1 > 0xff)
            throw new Error("bad oid: " + oid);
        byts.push(v0 * 40 + v1);
        for (var i = 2, len = arr.length; i < len; i++) {
            var num = +arr[i], bits = [];
            while (num >= 0x80) { bits.push(num % 0x80); num /= 0x80; }
            bits.push(num); bits.reverse();
            for (var j = 0, jl = bits.length - 1; j <= jl; j++) {
                if (j != jl) {
                    byts.push(0x80 + bits[j]);
                } else {
                    byts.push(bits[j]);
                }
            }
        }
        return new Uint8Array(byts);
    };
    ASN1.OID2Text = function (bytes) {
        var str = "", b0 = bytes[0];
        var m = b0 < 80 ? b0 < 40 ? 0 : 1 : 2;
        str += m + "." + (b0 - m * 40);
        for (var i = 1, len = bytes.length; i < len;) {
            var num = 0;
            for (; i < len;) {
                var bit = bytes[i++]; num *= 0x80;
                if (bit >= 0x80) num += bit - 0x80;
                else { num += bit; break; }
            }
            str += "." + num;
        }
        return str;
    };
    ASN1.ParseSize = function (pos, bytes) { //简单解析长度数值
        var bitCount = bytes[pos[0]++], size = 0;
        if (bitCount < 0x80) size = bitCount;
        else if (bitCount == 0x80) size = -404; //不定长，需搜索两个0结尾，直接拒绝支持
        else for (var i = 0, len = bitCount & 0x7F; i < len; i++)
            size = size * 256 + bytes[pos[0]++];
        if (size < 0 || size > bytes.length - pos[0]) throw new Error("ASN.1 Bad size " + size);
        return size;
    };
    ASN1.ParseBlock = function (pos, bytes, sub) { //简单解析一块子内容
        sub = sub || [];
        while (pos[0] < bytes.length) {
            var idx0 = pos[0], item = new ASN1();
            var tag = bytes[pos[0]++], size = ASN1.ParseSize(pos, bytes);
            if ((tag & 0x20) != 0) {//结构化容器，嵌套调用
                item.parse(bytes.slice(idx0, pos[0] + size));
            } else {//普通内容
                var chunk = bytes.slice(pos[0], pos[0] + size);
                if (tag == 0x02 || tag == 0x03) {//去掉开头补的0，正整数
                    if (chunk.length > 1 && chunk[0] == 0) {
                        chunk = chunk.slice(1);
                    }
                }
                item.setTag(tag);
                item.setBytes(chunk);
            }
            sub.push(item);
            pos[0] += size;
        }
        return sub;
    };
    ASN1.PEM2Bytes = function (pem) {
        pem = pem.replace(/[\s\r\n]/g, "");
        var m = /^-+BEGIN\w*-+([^-]+)-+END\w+-+$/i.exec(pem);
        try {
            return Base642Bytes(m[1]);
        } catch (e) {
            throw new Error(Lang('不是pem格式。', 'Not a pem format.'));
        }
    };
    ASN1.prototype = {
        setTag: function (tag) {
            var txt = (tag < 16 ? "0" : "") + tag.toString(16).toUpperCase();
            this.tag = tag;
            this.tagTxt = txt;
            this.tagName = ASN1.TagNames[txt] || "0x" + txt;
        }
        , setBytes: function (bytes) {
            if (bytes.length == null || (bytes.slice == null && bytes.subarray == null))
                throw new Error("Not Array");
            if (this.tag == 0x06) this.oid = ASN1.OID2Text(bytes);
            if (this.tag == 0x0C || this.tag == 0x13) this.string = Bytes2Str(bytes);
            this.bytes = bytes;
        }
        , push: function (asn1) {
            if (!asn1.parsePEM) throw new Error("Not ASN1");
            this.sub.push(asn1);
            return this;
        }
        , parsePEM: function (pem) {
            return this.parse(ASN1.PEM2Bytes(pem));
        }
        , parse: function (bytes) {
            var pos = [0];
            //最外层必须是个结构化容器，第6位为1，为0为基础类型 https://www.jianshu.com/p/ce7ab5f3f33a
            if ((bytes[0] & 0x20) == 0) throw new Error("ASN.1 parse: Not SEQ");
            this.setTag(bytes[pos[0]++]);
            var size = ASN1.ParseSize(pos, bytes);
            bytes = bytes.slice(pos[0], pos[0] + size);
            this.setBytes(bytes);
            //解析子内容
            ASN1.ParseBlock([0], bytes, this.sub);
            return this;
        }
        , toBytes: function (innerOlny) {
            var chunks = [], len = 0;
            if (this.sub.length) {//容器类型，递归调用
                for (var i = 0; i < this.sub.length; i++) {
                    var arr = this.sub[i].toBytes();
                    chunks.push(arr); len += arr.length;
                }
            } else if (this.bytes && this.bytes.length) {//简单类型
                if (this.tag == 0x02 && this.bytes[0] >= 0x80 || this.tag == 0x03) {
                    chunks.push([0]); len++;//0x02负数 0x03需要开头补0
                }
                chunks.push(this.bytes); len += this.bytes.length;
            }
            if (!innerOlny) {//添加标签和长度
                var arr = [], num = len;
                if (num < 0x80) arr.push(num);
                else {
                    while (num > 0xff) { arr.push(num & 0xff); num = num >> 8; }
                    arr.push(num & 0xff); arr.push(0x80 + arr.length);
                }
                arr.push(this.tag); arr.reverse();
                chunks.splice(0, 0, arr); len += arr.length;
            }
            var bytes = new Uint8Array(len), n = 0;
            for (var i = 0; i < chunks.length; i++) {
                var arr = chunks[i];
                bytes.set(arr, n); n += arr.length;
            }
            return bytes;
        }
    };

})();








































//===========================================================
//================= Common functions ==================
//===========================================================
//LICENSE: GPL-3.0, https://github.com/xiangyuecn/ACME-HTML-Web-Browser-Client

// ===========================================
// ===== Modified by: Qiu (zeoseven.com) =====
// ===========================================

(function () {
    "use strict";

    /************** Language **************/
    window.LangCur = "cn";
    window.Lang = function (getCn, getEn, getTxt) {
        const cn = getCn, en = " "+getEn,txt = getTxt;
        if (txt) return LangCur == "cn" ? cn : en;
        var html = "", ks = { cn: cn, en: en };
        for (var k in ks) {
            html += (LangCur != k ? '<!--LangHide1-->' : '')
                + '<span class="lang' + k.toUpperCase()
                + '" style="' + (LangCur == k ? '' : 'display:none')
                + '">' + ks[k] + '</span>'
                + (LangCur != k ? '<!--LangHide2-->' : '');
        }
        return html;
    };
    window.LangReview = function (cls) {
        var el = $(cls || "body");
        el.find(".langCN")[LangCur == "cn" ? "show" : "hide"]();
        el.find(".langEN")[LangCur != "cn" ? "show" : "hide"]();
        var inputs = el.find(".inputLang");
        for (var i = 0; i < inputs.length; i++)
            inputs[i].setAttribute("placeholder", inputs[i].getAttribute("placeholder-" + LangCur));
    };
    window.LangClick = function (lang) {
        LangCur = lang;
        LangReview();
        $(".langBtn").css("color", null);
        $(".langBtn_" + lang).css("color", "#000");
        $("body").css("wordBreak", lang == "cn" ? "break-all" : null);

        if (!document.titleLang) document.titleLang = document.title;
        var arr = document.titleLang.split("|"), t1 = [], t2 = [];
        for (var i = 0; i < arr.length; i++)
            if (/[^\x00-\xff]/.test(arr[i]) == (LangCur == "cn")) t1.push(arr[i].trim());
            else t2.push(arr[i].trim());
        document.title = t1.concat(t2).join(" | ");
    };


    /************** Console log output **************/
    window.CLog = function (tag, color, msg) {
        var now = new Date();
        var t = ("0" + now.getMinutes()).substr(-2)
            + ":" + ("0" + now.getSeconds()).substr(-2)
            + "." + ("00" + now.getMilliseconds()).substr(-3);
        msg = msg.replace(/<!--LangHide1[\S\s]+?LangHide2-->/g, "");//去掉没有显示的语言
        msg = msg.replace(/<[^>]+>/g, "");
        var arr = ["[" + t + " " + tag + "]" + msg];
        for (var i = 3; i < arguments.length; i++) {
            arr.push(arguments[i]);
        };
        var fn = color == 1 ? console.error : color == 3 ? console.warn : color == 4 ? console.debug : console.log;
        fn.apply(console, arr);
        return msg;
    };


    /************** $ Selector / like jQuery **************/
    (function () {
        window.$ = function (cls) { if (cls && cls.is$) return cls; return new fn(cls) }
        var fn = function (cls, node) {
            this.length = 0;
            if (!cls) return;
            if (cls.appendChild) { this.push(cls); return }
            var arr = (node || document).querySelectorAll(cls);
            for (var i = 0; i < arr.length; i++)this.push(arr[i]);
        };
        fn.prototype = {
            is$: 1
            , push: function (val) { this[this.length++] = val }
            , find: function (cls) { var el0 = this[0]; return new fn(el0 ? cls : "", el0) }
            , val: function (val) { return this.prop("value", val) }
            , hide: function () { return this.css("display", "none") }
            , show: function (display) { return this.css("display", display === undefined ? null : display) }

            , html: function (html) {
                var el0 = this[0];
                if (html === undefined) return el0 && el0.innerHTML || "";
                for (var i = 0; i < this.length; i++) this[i].innerHTML = html;
                return this;
            }
            , append: function (html) { return this._end(html) }
            , prepend: function (html) { return this._end(html, 1) }
            , _end: function (html, prep) {
                var el0 = this[0];
                if (html && el0) {
                    var nodes = html;
                    if (typeof (html) == "string") {
                        var div = document.createElement("div");
                        div.innerHTML = html;
                        nodes = [];
                        for (var i = 0; i < div.childNodes.length; i++)nodes.push(div.childNodes[i]);
                    } else if (html.appendChild) {
                        nodes = [html];
                    }
                    if (prep) prep = el0.firstChild;
                    for (var i = 0; i < nodes.length; i++) {
                        if (prep) el0.insertBefore(nodes[i], prep);
                        else el0.appendChild(nodes[i])
                    }
                }
                return this;
            }
            , prop: function (key, val) {
                var el0 = this[0];
                if (val === undefined) return el0 && el0[key];
                for (var i = 0; i < this.length; i++) this[i][key] = val;
                return this;
            }
            , attr: function (key, val) {
                var el0 = this[0];
                if (val === undefined) return el0 && el0.getAttribute(key);
                for (var i = 0; i < this.length; i++) {
                    if (val == null) this[i].removeAttribute(key);
                    else this[i].setAttribute(key, val);
                }
                return this;
            }
            , css: function (key, val) {
                for (var i = 0; i < this.length; i++)
                    this[i].style[key] = val;
                return this;
            }
            , bind: function (type, fn) {
                for (var i = 0; i < this.length; i++)
                    this[i].addEventListener(type, fn);
                return this;
            }
        };
    })();


    /************** functions **************/
    window.FormatText = function (str) {
        return str.replace(/[&<>='"]/g, function (a) { return "&#" + a.charCodeAt(0) + ";" });
    };

    window.Str2Bytes = function (str) {
        str = unescape(encodeURIComponent(str));
        var u8arr = new Uint8Array(str.length);
        for (var i = 0; i < str.length; i++)u8arr[i] = str.charCodeAt(i);
        return u8arr;
    };
    window.Bytes2Str = function (bytes) {
        var str = "";
        for (var i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
        return decodeURIComponent(escape(str));
    };
    window.Json2UrlB64 = function (data) {
        return Bytes2UrlB64(JSON.stringify(data));
    };
    window.Base642Bytes = function (b64) {
        var str = atob(b64);
        var u8arr = new Uint8Array(str.length);
        for (var i = 0; i < str.length; i++)u8arr[i] = str.charCodeAt(i);
        return u8arr;
    };
    window.UrlB642Bytes = function (str) {
        str = str.replace(/_/g, "\/").replace(/-/g, "+");
        while (str.length % 4) str += "=";
        return Base642Bytes(str);
    };
    window.Bytes2UrlB64 = function (bytes) {//二进制数组转成url base64
        return Bytes2Base64(bytes).replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "");
    };
    window.Bytes2Base64 = function (bytes) {
        var str = "";
        if (typeof (bytes) == "string") {
            str = unescape(encodeURIComponent(bytes));
        } else {
            if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
            for (var i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
        }
        return btoa(str);
    };

})();































//===========================================
//================= Launch ==================
//===========================================
//LICENSE: GPL-3.0, https://github.com/xiangyuecn/ACME-HTML-Web-Browser-Client

// ===========================================
// ===== Modified by: Qiu (zeoseven.com) =====
// ===========================================

(function () {
    "use strict";

    var msg = "";
    try {
        window.PageRawHTML = window.PageRawHTML || document.documentElement.outerHTML;
        var SupportCrypto = false;
        eval('SupportCrypto=!!crypto.subtle.sign');
        eval('``;(async function(){class a{}})');
    } catch (e) {
        if (!msg && !SupportCrypto && window.isSecureContext === false) {
          msg = "no-https"
        }
        if (!msg) {
          msg = SupportCrypto ? "browser-old-version" : "no-crypto";
        }
        window.location.href = '/info/errorPage/?msg=' + encodeURIComponent(msg);
        return;
    }
    $(".main").html($(".main").html()); //彻底干掉输入框自动完成
    $("input,textarea,select").attr("autocomplete", "off");

    $(".main-load").hide();
    $(".main").show();
    LangClick(LangCur);

    initMainUI();

})();