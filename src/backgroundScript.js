chrome.runtime.onInstalled.addListener(function () {

});

var database = [
    {
        "Stylish": "/* Displays images when using search preview extension. Example:https://www.google.com/search?q=food&num=20&source=lnms&tbm=nws&sa=X&ved=0ahUKEwjalvHv0OHWAhXD2SYKHSRwBqUQ_AUIDCgD */ @-moz-document domain(\"google.com\") { div.bkWMgd > div > div > a > img{ display: inline-block !important; }}",
        "exampleUrl": "http://www.google.com/search?q=AutoPagerize\r\nhttp://www.google.co.jp/custom?q=firefox\r\nhttps://www.google.com/search?q=bucket&tbm=pts",
        "comment": "Google Custom Search Result: http://wedata.net/items/60908\r\nGoogle Movies: http://wedata.net/items/58112\r\nGoogle Shopping: http://wedata.net/items/38952\r\nGoogle Custom Search Result: http://wedata.net/items/60908",
        "url": "^https?://[^./]+\\.google(?:\\.[^./]{2,3}){1,2}/(?:c(?:se|ustom)|search|webhp|m|#|)",
        "pageElement": "id('res')//li[div]|//div[@class='gsc-webResult gsc-result' or @class='psli']|id('rso')//div[contains(concat(\" \", normalize-space(@class), \" \"), \" g \") or contains(concat(\" \", normalize-space(@class), \" \"), \" g _cy \")]",
        "nextLink": "id('pnnext')|id('navbar navcnt nav')//td[span]/following-sibling::td[1]/a|id('nn')/parent::a"
    },
    {
        url: 'http[s]?://(.*).google.+/(search).+', // match url (RegExp)
        nextLink: 'id("navbar")//td[last()]/a', // next link location (XPath)
        pageElement: '//div[@id="res"]/div', // pagination insert location (XPath)
        exampleUrl: 'http://www.google.com/search?q=nsIObserver', // sample URL for testing
    },
    {
        urlRegExp: "",
        pageItemXPath: "",
        nextLinkXPath: "",
    }
];

window.onload = function () {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request) {
            var matchingDescriptor = database.find(d => {
                return request.match(d.url);
            });
            // if (matchingDescriptor) {
            //     log(`found a match`, matchingDescriptor);
            // } else {
            //     log(`this page has no matches`);
            // }
            if (!matchingDescriptor) {
                return;
            }

            sendResponse(matchingDescriptor);
        } else {
            chrome.runtime.Port.disconnect();
        }
    });
}

