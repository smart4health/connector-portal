/**
 * This is the javascript snippet to be inserted in each page
 * where the iframe is hosted. The `CONNECTOR_DOMAIN` must be changed
 * for each usage as the backend will change each time.
 */
(function () {
    const CONNECTOR_DOMAIN = "%CONNECTOR_DOMAIN%";
    var params = parseQuery(queryString());

    loadIframe(params.token, params.lang);

    /**
     *
     * @param {String} token
     * @param {String} lang
     * @return any
     */
    function loadIframe(token, lang) {
        var iframe = document.getElementById("hmx-pin");
        if (!iframe) {
            throw new Error("HTML Element with id 'hmx-pin' must be present on page")
        }

        iframe.src = `${CONNECTOR_DOMAIN}/frontend/send-sms?token=${token}&lang=${lang}`;
    }

    /**
     * @return {String}
     */
    function queryString() {
        return window.location.search.substring(1) || "";
    }

    /**
     *
     * @param {String} query
     * @return {Object} { token: String, lang: String }
     */
    function parseQuery(query) {
        return query.split('&').reduce(function (acc, curr) {
            var queryTuple = curr.split('=');
            acc[queryTuple[0]] = queryTuple[1];
            return acc;
        }, {});
    }
})();
