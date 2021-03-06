/*
    Query URL: https://www.wowhead.com/items?filter=82:2;2:2;80200:0
    TODO: Remember to check for items with name like: REUSE ME
*/
function run() {
    const scripts = $("script");
    Object.keys(scripts).forEach(key => {
        const content = scripts[key].textContent;
        if (content) {
            const listViewsResult = /WH.Gatherer.addData\(3, "[a-zA-Z]{1,5}", {(.|\s)*}\);/g.exec(
                content
            );
            const dbrx = /{(.|\s)*}/g;
            if (
                listViewsResult !== null &&
                listViewsResult &&
                listViewsResult.length > 0
            ) {
                const regexRes = dbrx.exec(listViewsResult[0])[0],
                    resultList = regexRes.split(";");
                if (regexRes && resultList) {
                    console.log(convert(resultList[0].replace(/\)$/, '')));
                }
            }
        }
    });
}

function convert(input) {
    try {
        const array = JSON.parse(input);
        return {
            items: array
        };
    } catch (e) {
        console.error(e);
        return e;
    }
}

run();
