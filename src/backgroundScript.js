chrome.runtime.onInstalled.addListener(function () {

});

window.onload = function () {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request) {
            fetch('http://next-page-server.ciborski.com:3214/', {
                body: request,
                method: 'post'
            }).then(response => {
                return response.text().then(text=>{
                    console.log(text);
                    sendResponse(JSON.parse(text));
                })
            }).catch(error => {
                console.error(error);
                sendResponse(null);
            })
            return true;
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

