var consoleLog = () => { }; //console.log;
var consoleCount = () => { }; //console.count;
var consoleError = () => { }; // console.error;

function matchLocal(urlToMatch, callback) {
    var rules = localStorage.getItem('rules') || '';

    var rlz = [];

    var arr = rules.split('\n').map(s => s.trim());
    for (var i = 0; i < arr.length; i += 4) {
        var url = skipFirstWord(arr[i + 0]);
        var pageElement = skipFirstWord(arr[i + 1]);
        var nextLink = skipFirstWord(arr[i + 2]);
        var emptyLine = arr[i + 3];

        var rx = new RegExp(url);
        if (rx.test(urlToMatch)) {
            rlz.push({
                url,
                pageElement,
                nextLink,
            })
        }
    }
    return callback(rlz);
}

function skipFirstWord(str) {
    var idx = str.indexOf(' ');
    return str.substring(idx + 1);
}

window.onload = function () {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request) {
            if (request.type === `findUrlDescriptor`) {
                fetch('http://next-page-server.ciborski.com:3214/', {
                    body: request.url,
                    method: 'post'
                }).then(response => {
                    return response.text().then(text => {
                        consoleLog(text);
                        var resultsArray = JSON.parse(text)
                        matchLocal(request.url, (rlz) => {
                            resultsArray = resultsArray.concat(rlz);
                            sendResponse(resultsArray);
                        })
                    })
                }).catch(error => {
                    consoleLog(error);
                    sendResponse(null);
                })
                return true;
            } else if (request.type === 'setStatus') {
                var { statusText, statusColorHex } = request;

                chrome.browserAction.setBadgeText({ text: statusText });
                chrome.browserAction.setBadgeBackgroundColor({ color: statusColorHex });

                sendResponse(null);
                return true;
            }

            return false;
        } else {
            chrome.runtime.Port.disconnect();
            return false;
        }
    });
}

function buildUrl(url, parameters) {
    let qs = "";
    for (const key in parameters) {
        if (parameters.hasOwnProperty(key)) {
            const value = parameters[key];
            qs +=
                encodeURIComponent(key) + "=" + encodeURIComponent(value) + "&";
        }
    }
    if (qs.length > 0) {
        qs = qs.substring(0, qs.length - 1); //chop off last "&"
        url = url + "?" + qs;
    }

    return url;
}

