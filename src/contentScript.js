var manuallyAddedDescriptors = [
    {
        url: `^https://www\.linuxquestions\.org/questions/`,
        pageElement: `//div[@id="posts"]//div[@class="page"]`,
        nextLink: `//a[@rel="next"]`,
    },
    {
        pageElement: `//table[@id="threadslist"]//tbody[starts-with(@id, "threadbits_")]//tr`,
        nextLink: `//a[@rel="next"]`,
    }
]

window.addEventListener('load', () => {
    var urlOfInterest = window.location.href;
    chrome.runtime.sendMessage({ type: "findUrlDescriptor", url: urlOfInterest }, async function (descriptors) {
        if (!descriptors || descriptors.length === 0) {
            console.log(`found no descriptors for url`, urlOfInterest);
            return;
        }
        descriptors = descriptors.concat(manuallyAddedDescriptors);
        console.log(`found ${descriptors.length} matching descriptors for`, urlOfInterest);

        var i = 0;
        run({}, descriptors[i], i, function handleRunCallback(error) {
            if (error) {
                console.log(`descriptor ${i} failed with error`, error)
                i++;
                if (!descriptors[i]) {
                    console.log(`and there are no more descriptors available for this url`)
                    return;
                }

                console.log(`but there is another descriptor available`);
                run({}, descriptors[i], i, handleRunCallback);
            }
        });
    });
});

var log = console.info;

function run(options, matchingDescriptor, descriptorNumber, runCallback) {
    console.log(`iterating descriptor ${descriptorNumber}`, matchingDescriptor);
    loop(window.document, null, 2, loop);
    return;

    function loop(root, appendNode /* ? */, pageNumber, loopCallback) {
        console.log('removeme', appendNode, root);
        var subscription = subscribeEndOfPageEvent(async function handleEndOfPageEvent() {
            if (subscription) {
                subscription.cancel();
            }

            if (!appendNode) {
                // step 2, find insert location
                appendNode = getAppendNodeByFindingCommonAncestor(root, matchingDescriptor.pageElement);
                if (appendNode) {
                    log(`found append node`, appendNode);
                } else {
                    return runCallback('cannot find append node');
                }
            }

            // step 3, find next link element
            var nextPageElement = getElementByXPath(root, matchingDescriptor.nextLink)
            if (nextPageElement) {
                log(`found next link element`, nextPageElement);
            } else {
                return runCallback('cannot find next link element');
            }

            // step 4, insert page
            var nextPageUrl = getElementHref(nextPageElement);

            var response = await fetch(nextPageUrl);
            var responseText = await response.text();
            responseText = stripHtmlTag(responseText);
            var domParser = new DOMParser();
            var nextRoot = domParser.parseFromString(responseText, 'text/html');
            nextRoot = removeScripts(nextRoot);
            var nextPageFragments = getAllElementsByXPath(nextRoot, matchingDescriptor.pageElement);


            appendNode.appendChild(document.createElement("hr"));
            appendNode.appendChild(document.createTextNode(`Following Page Number: ${pageNumber}`));
            appendNode.appendChild(document.createElement("hr"));

            for (var i = 0; i < nextPageFragments.snapshotLength; i++) {
                var pageFragment = nextPageFragments.snapshotItem(i);
                appendNode.appendChild(pageFragment);
            }


            loopCallback.call(null, nextRoot, appendNode, pageNumber + 1, loopCallback);
            return runCallback(null);
        })
    }

    function getAppendNodeByFindingCommonAncestor(root, pageFragmentXPath) {
        var appendNode = null;
        // compute first common parent for all pageFragments
        var nodes = getAllElementsByXPath(root, pageFragmentXPath);

        if (nodes.snapshotLength <= 0) {
            appendNode = null;
        } else if (nodes.snapshotLength === 1) {
            appendNode = nodes.snapshotItem(0).parentNode;
        } else if (nodes.snapshotLength >= 2) {
            // // take first 2 for performance optimization
            // var fragment1 = nodes.snapshotItem(0);
            // var fragment2 = nodes.snapshotItem(1);
            // console.log(`f1:`, fragment1);
            // console.log(`f2:`, fragment2);
            // appendNode = findFirstCommonAncestor(fragment1, fragment2);
            var nodesArray = [];
            for (var i = 0; i < nodes.snapshotLength; i++) {
                nodesArray.push(nodes.snapshotItem(i));
            }

            appendNode = getCommonAncestor.apply(null, nodesArray);
        } else {
            throw 'whaat?!'
        }

        // log(`an:`, appendNode);

        return appendNode;
    }

    function subscribeEndOfPageFragmentEvent(callback) {
        // TODO this is better
    }

    function subscribeEndOfPageEvent(callback) {
        if (onScroll()) {

        } else {
            console.count(`subscribed to end of page event`);
            window.addEventListener("scroll", onScroll,
                {
                    passive: true, useCapture: false
                }
            );
        }



        return {
            cancel() {
                console.count(`cancelled subscription to end of page event`);
                window.removeEventListener("scroll", onScroll,
                    {
                        passive: true, useCapture: false
                    }
                );
            }
        }

        function isEndOfPage() {
            var distanceFromBottom = -((window.innerHeight + window.scrollY) - document.body.scrollHeight);
            if (distanceFromBottom <= 400) { // to powinno byc jezeli 400px od ostatniego pageFragment w DOMie, NIE-OD-KONCA-STRONY
                return true;
            }
        }

        function onScroll() {
            if (isEndOfPage()) {
                console.log(`reached end of page`);
                callback();
                return true;
            }
        }
    }

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


/**
 * @param {Function} fn Function to curry.
 * @param {Number} lenght The arguments required to invoke the function. Optional. By default is fn.length
 * @returns {Function} The currified function.
 */
function curry(fn, length) {
    length = length || fn.length;
    return function currified() {
        var args = [].slice.call(arguments);

        if (args.length === 0)
            return currified;

        if (args.length >= length)
            return fn.apply(this, args);

        var child = fn.bind.apply(fn, [this].concat(args));
        return curry(child, length - args.length);
    };
}






function findFirstCommonAncestor(nodeA, nodeB, ancestorsB) {
    var ancestorsB = ancestorsB || getAncestors(nodeB);
    if (ancestorsB.length == 0) return null;
    else if (ancestorsB.indexOf(nodeA) > -1) return nodeA;
    else if (nodeA == document) return null;
    else return findFirstCommonAncestor(nodeA.parentNode, nodeB, ancestorsB);
}

function getAncestors(node) {
    if (node != document) {
        return [node].concat(getAncestors(node.parentNode));
    } else {
        return [node];
    }
}


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