var noop = () => { };
var consoleLog = noop;
var consoleCount = noop;
var consoleError = noop;

window.addEventListener('load', async () => {
    var descriptors = await getDecriptiorsForUrl(window.location.href);
    descriptors = descriptors.map(d => {
        return {
            pageFragmentXPath: d.pageElement,
            nextPageButtonXPath: d.nextLink,
        }
    })
    var root = document;
    descriptorLoop:
    for (var desciptor of descriptors) {
        consoleLog(desciptor);

        // get append node first so we know where is "end of page"
        var appendNode = await findCommonAncestor(root, desciptor.pageFragmentXPath);
        if (!appendNode) {
            consoleLog('cannot find append node');
            continue descriptorLoop;
        }

        infiniteNextPageLoop:
        while (true) {
            var nextPageButton = await getElementByXPath(root, desciptor.nextPageButtonXPath);
            if (!nextPageButton) {
                consoleLog('cannot find next page node');
                continue descriptorLoop;
            }

            await nodeProximityEvent(appendNode, 400);
            consoleLog(`reached close proximity`)

            var nextPage = await fetchNextPage(nextPageButton);
            var sanitizedNextPage = await sanitizeNextPage(nextPage);
            await new Promise((resolve) => {
                setTimeout(resolve, 500);
            });
            var nextPageFragmentsXPathResult = getAllElementsByXPath(sanitizedNextPage, desciptor.pageFragmentXPath);

            await append(appendNode, nextPageFragmentsXPathResult);

            root = nextPage;
        }
    }
});

async function getDecriptiorsForUrl(urlOfInterest) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "findUrlDescriptor", url: urlOfInterest }, async function (descriptors) {
            if (!descriptors || descriptors.length === 0) {
                consoleLog(`found no descriptors for url`, urlOfInterest);
                return resolve([]);
            }
            consoleLog(`found ${descriptors.length} matching descriptors for`, urlOfInterest);
            return resolve(descriptors);
        });
    })
}

function findCommonAncestor(root, pageFragmentXPath) {
    var appendNode = null;
    // compute first common parent for all pageFragments
    var nodes = getAllElementsByXPath(root, pageFragmentXPath);

    if (nodes.snapshotLength <= 0) {
        appendNode = null;
    } else if (nodes.snapshotLength === 1) {
        appendNode = nodes.snapshotItem(0).parentNode;
    } else if (nodes.snapshotLength >= 2) {
        var nodesArray = [];
        for (var i = 0; i < nodes.snapshotLength; i++) {
            nodesArray.push(nodes.snapshotItem(i));
        }

        appendNode = getCommonAncestor.apply(null, nodesArray);
    } else {
        throw 'whaat?!'
    }

    return appendNode;

    // https://stackoverflow.com/questions/3960843/how-to-find-the-nearest-common-ancestors-of-two-or-more-nodes/7648545#7648545
    function getCommonAncestor(node1 /*, node2, node3, ... nodeN */) {
        if (arguments.length < 2)
            throw new Error("getCommonAncestor: not enough parameters");

        var i,
            method = "contains" in node1 ? "contains" : "compareDocumentPosition",
            test = method === "contains" ? 1 : 0x0010,
            nodes = [].slice.call(arguments, 1);

        rocking:
        while (node1 = node1.parentNode) {
            i = nodes.length;
            while (i--) {
                if ((node1[method](nodes[i]) & test) !== test)
                    continue rocking;
            }
            return node1;
        }

        return null;
    }
}

function getAllElementsByXPath(doc, xPath) {
    return document.evaluate(xPath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
}

function getElementByXPath(doc, xPath) {
    return document.evaluate(xPath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

async function nodeProximityEvent(node, activationDistancePx) {
    return new Promise((resolve, reject) => {

        if (isEndOfPage()) {
            return resolve();
        } else {
            consoleCount(`subscribed to end of page event`);
            window.addEventListener("scroll", onScroll,
                {
                    passive: true, useCapture: false
                }
            );
        }

        function onScroll() {
            if (isEndOfPage()) {
                window.removeEventListener("scroll", onScroll,
                    {
                        passive: true, useCapture: false
                    }
                );
                consoleCount(`cancelled subscription to end of page event`);
                return resolve();
            }
        }


        return {
            cancel() {

            }
        }

        function isEndOfPage() {
            var endOfViewPortPositionY = (window.innerHeight + window.scrollY);
            var endOfNodePositionY = getOffset(node).top + node.scrollHeight;

            if (endOfNodePositionY - endOfViewPortPositionY < activationDistancePx) {
                return true;
            }
        }

        function getOffset(el) {
            const rect = el.getBoundingClientRect();
            return {
                // left: rect.left + window.scrollX,
                top: rect.top + window.scrollY
            };
        }
    })
}

async function fetchNextPage(nextPageElement) {
    // step 4, insert page
    var nextPageUrl = getElementHref(nextPageElement);

    var response = await fetch(nextPageUrl);
    var responseText = await response.text();
    responseText = stripHtmlTag(responseText);
    var domParser = new DOMParser();
    var nextRoot = domParser.parseFromString(responseText, 'text/html');
    return nextRoot;
}

async function sanitizeNextPage(nextPageElement) {
    var sanitized = removeScripts(nextPageElement);

    return sanitized;
}

function append(appendNode, nextPageFragments) {
    appendNode.appendChild(document.createElement("hr"));
    appendNode.appendChild(document.createTextNode(`next page`));
    appendNode.appendChild(document.createElement("hr"));

    for (var i = 0; i < nextPageFragments.snapshotLength; i++) {
        var pageFragment = nextPageFragments.snapshotItem(i);
        appendNode.appendChild(pageFragment);
    }
}

function removeScripts(doc) {
    var ss = doc.querySelectorAll('script')
    for (var i = 0; i < ss.length; i++) {
        ss[i].parentNode.removeChild(ss[i])
    }
    return doc
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

