(function () {
    const anchor = document.getElementById('help-anchor');

    const queryParams = parseQuery(queryString());
    let body = `Case ${queryParams.correlationId}`;
    const subject = "Issue with Connector Pairing";
    const errorKind = queryParams.kind;
    if (errorKind) {
        body += `\r\nError: ${queryParams.kind}`
    }
    anchor.setAttribute("href", constructMailToHref(queryParams.emailContact, subject, body));

    anchor.innerText = decodeURIComponent(queryParams.emailContact);

    let issueNumberElement = document.getElementById('issue-number');
    if (issueNumberElement) {
        issueNumberElement.innerText = queryParams.correlationId;
    }

    const errorKindElement = document.getElementById(`error_kind_${errorKind}`);
    if (errorKindElement) {
        errorKindElement.classList.remove('hidden');
    } else {
        const defaultErrorKind = document.getElementById(`error_kind_default`);
        if (defaultErrorKind) {
            defaultErrorKind.classList.remove('hidden');
        }
    }

    const hide_contact_form_error_kinds = ['malformed_token', 'expired_token'];
    if (hide_contact_form_error_kinds.includes(errorKind)) {
        const errorContact = document.getElementById('error-contact');
        errorContact.classList.add('hidden');
    }

    /**
     * Constructs the href attribute for the anchor tag
     * so we can dynamically determine from the server
     * who to send help emails to.
     *
     * @return {String}
     */
    function constructMailToHref(emailContact, subjectText, bodyText) {
        return `mailto:${emailContact}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`
    }

    /**
     * @return {String}
     */
    function queryString() {
        const query = window.location.search.substring(1);
        if (!query) {
            console.log("Loading error page without query string...");
            return "";
        }
        return query;
    }

    /**
     *
     * @param {String} query
     * @return {Object} { emailContact: String, lang: String, correlationId: String }
     */
    function parseQuery(query) {
        return query.split('&').reduce(function (acc, curr) {
            const queryTuple = curr.split('=');
            acc[queryTuple[0]] = queryTuple[1];
            return acc;
        }, {});
    }
})();