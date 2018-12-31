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

var options = {

};

run(options, database);



async function run(options, database) {

    // await once([
    //     waitForProximityEvent,
    //     matchUrl,
    //     findAllPageItems(window.document),
    //     computeInsertLocation,
    //     loadNextPage,
    //     await loop([
    //         waitForProximityEvent,
    //         findAllPageItems(window.document),
    //         computeInsertLocation,
    //         loadNextPage,
    //     ])
    // ])

    function subscribeEndOfPageEvent(callback) {
        // console.log('subscribing scroll event')
        window.addEventListener("scroll", onScroll,
            {
                passive: true, useCapture: false
            }
        );
        setTimeout(onScroll, 1); // init

        function onScroll() {
            // var remainHeight = scrollHeight - bottom + BASE_REMAIN_HEIGHT
            // var pageHeight = document.documentElement.scrollHeight;
            // var viewPortHeight = window.innerHeight;
            // var scrollTopPosition = window.scrollY;
            var distanceFromBottom = -((window.innerHeight + window.scrollY) - document.body.scrollHeight);
            // console.log(distanceFromBottom);
            if (distanceFromBottom <= 200) {
                callback(distanceFromBottom);
            }
        }

        return {
            cancel() {
                window.removeEventListener("scroll", onScroll,
                    {
                        passive: true, useCapture: false
                    }
                );
            }
        }
    }


    // console.debug(`subscribed to scroll event`, matchingDescriptor);

    console.log('www')
    var subscription = subscribeEndOfPageEvent(async (y) => {
        subscription.cancel();

        // step 1, match url
        var matchingDescriptor = database.find(d => {
            return window.location.href.match(d.url);
        });
        if (matchingDescriptor) {
            console.debug(`found a match`, matchingDescriptor);
        } else {
            console.debug(`this page has no matches`);
        }
        if (!matchingDescriptor) {
            return;
        }


        // step 2, match insert location
        var matchingPageElement = getElementByXPath(window.document, matchingDescriptor.pageElement)
        if (matchingPageElement) {
            console.debug(`found a matching page element`, matchingPageElement);
        } else {
            console.debug(`this page has no matchning page element`, matchingDescriptor);
        }
        if (!matchingPageElement) {
            return;
        }


        // step 3, match next link element
        var matchingNextLinkElement = getElementByXPath(window.document, matchingDescriptor.nextLink)
        if (matchingNextLinkElement) {
            console.debug(`found a matching next link element`, matchingNextLinkElement);
        } else {
            console.debug(`this page has no matchning next element`, matchingDescriptor);
        }
        if (!matchingNextLinkElement) {
            return;
        }

        // step 4, create insert location
        var nextPageUrl = getElementHref(matchingNextLinkElement);

        var response = await fetch(nextPageUrl);
        var responseText = await response.text();
        responseText = stripHtmlTag(responseText);
        var domParser = new DOMParser();
        var doc = domParser.parseFromString(responseText, 'text/html');
        doc = removeScripts(doc);
        var nextPageFragments = getAllElementsByXPath(doc, matchingDescriptor.pageElement);

        console.log('appending');
        for (var i = 0; i < nextPageFragments.snapshotLength; i++) {
            var pageFragment = nextPageFragments.snapshotItem(i);
            matchingPageElement.parentElement.appendChild(pageFragment);
        }
    })







    function getElementByXPath(doc, xPath) {
        return document.evaluate(xPath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    function getAllElementsByXPath(doc, xPath) {
        return document.evaluate(xPath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    }

    function getElementHref(element) {
        var href = element.getAttribute('href') || element.getAttribute('action') || element.value;
        if (href) {
            return toAbsoluteAddress(href);
        } else {
            return null;
        }
    }

    function toAbsoluteAddress(relativeAddress) {
        var link = document.createElement("a");
        link.href = relativeAddress;
        return link.href;
    }

    function removeScripts(doc) {
        var ss = doc.querySelectorAll('script')
        for (var i = 0; i < ss.length; i++) {
            ss[i].parentNode.removeChild(ss[i])
        }
        return doc
    }


    function stripHtmlTag(str) {
        var chunks = str.split(/(<html(?:[ \t\r\n][^>]*)?>)/)
        if (chunks.length >= 3) {
            chunks.splice(0, 2)
        }
        str = chunks.join('')
        chunks = str.split(/(<\/html[ \t\r\n]*>)/)
        if (chunks.length >= 3) {
            chunks.splice(chunks.length - 2)
        }
        return chunks.join('')
    }

    function createHTMLDocumentByString(str) {
        if (document.documentElement.nodeName != 'HTML') {
            return new DOMParser().parseFromString(str, 'application/xhtml+xml')
        }
        var html = strip_html_tag(str)
        var htmlDoc
        try {
            // We have to handle exceptions since Opera 9.6 throws
            // a NOT_SUPPORTED_ERR exception for |document.cloneNode(false)|
            // against the DOM 3 Core spec.
            htmlDoc = document.cloneNode(false)
            htmlDoc.appendChild(htmlDoc.importNode(document.documentElement, false))
        }
        catch (e) {
            htmlDoc = document.implementation.createDocument(null, 'html', null)
        }
        var fragment = createDocumentFragmentByString(html)
        try {
            fragment = htmlDoc.adoptNode(fragment)
        }
        catch (e) {
            fragment = htmlDoc.importNode(fragment, true)
        }
        htmlDoc.documentElement.appendChild(fragment)
        return htmlDoc
    }

    function createDocumentFragmentByString(str) {
        var range = document.createRange()
        range.setStartAfter(document.body)
        return range.createContextualFragment(str)
    }
}
