(function () {
    document.getElementById('get-started').addEventListener('click', function (event) {
        event.preventDefault();
        var params = parseQuery(queryString());
        var token = params.token || "";
        var lang = extractLang();
        window.location.href = `/${lang}/confirm.html?token=${token}&lang=${params.lang}`;
    });

    /**
     * @return {String}
     */
    function extractLang() {
        return window.location.pathname.split('/').filter(elem => !!elem)[0];
    }

    /**
     * @return {String}
     */
    function queryString() {
        var query = window.location.search.substring(1);
        if (!query) {
            console.log("No token present");
            return "";
        }
        return query;
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
