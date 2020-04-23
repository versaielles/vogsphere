/* CLAIM CODE GENERATOR
Purpose: Convert member-provided answers from the associated form into the code admins need to update the various claims lists. 
*/
(function () {
    "use strict";

    const runBtn = document.getElementById("js-claim-generator-run");

    // get a handle on the place the code needs to go
    const resultBox = document
        .getElementById("js-claim-generator-result")
        .querySelector("code"); // TODO: demo version, comment out when actually using
        // .querySelector("td#code"); // TODO: real version

    const formId = runBtn.getAttribute("form");
    const form = document.getElementById(formId);

    const indent1 = "    ";
    const newline = "\n";
    const newlineDouble = "\n\n";

    // square brackets must be escaped or else they get processed right away by Jcink
    const leftBracket = "&#91;";
    const rightBracket = "&#93;";

    // DOHTML codes
    let postBbcodeName = "pathfinder"; // TODO: should be the bbcode name of your site's post template
    let postBbcodeOpen = leftBracket + postBbcodeName + rightBracket;
    let postBbcodeClose = leftBracket + "/" + postBbcodeName + rightBracket;

    let codeBbcodeOpen = leftBracket + "code" + rightBracket;
    let codeBbcodeClose = leftBracket + "/code" + rightBracket;

    let boldOpen = leftBracket + "b" + rightBracket;
    let boldClose = leftBracket + "/b" + rightBracket;

    function bold(content) { return `${boldOpen}${content}${boldClose}`; }
    function url(address) { return `${leftBracket}url="${address}"${rightBracket}${address}${leftBracket}/url${rightBracket}`; }

    let fields = {
        text: [
            "characterName"
            , "faceClaim"
            , "labDescription"
            , "labName"
            , "memberGroup"
            , "occupation"
            , "profileUrl"
            , "requester"
            , "requestLocation"
            , "writerAlias"
        ],
        bool: [
            "isLabLead"
            , "isNewLab"
        ]
    };
    let input = {};
    let errors = [];

    class claimText {
        constructor(name) {
            this.value = form.elements[name].value;
            this.required = form.elements[name].required;
        }
    }

    function isInForm(name) {
        return !!form.elements[name];
    }

    function reset() {
        // clear any past results
        resultBox.innerHTML = "";

        // clear past errors
        errors = [];
    }

    function getInput() {
        for (const type in fields) {
            fields[type].forEach(fieldName => {
                if (!isInForm(fieldName)) {
                    errors.push(`ERROR: Could not find field with name "${fieldName}" in form. Contact admin`);
                } else {
                    switch(type) {
                        case "text":
                            input[fieldName] = new claimText(fieldName);
                            break;
                        case "bool":
                            input[fieldName] = (form.elements[fieldName].value === "true");
                            break;
                        default:
                            errors.push(`ERROR: Form field type "${type}" is unsupported. Contact admin`);
                            break;
                    }
                }
            });
        }
    }

    function validateInput() {
        // check that required input is present
        for (const x in input) {
            if (input[x].required && !input[x].value) {
                errors.push(`ERROR: Missing ${x}`);
            }
        }

        // check for context-sensitive errors
        if (
            input.memberGroup.value == "scientist"
            && input.isNewLab
            && !input.labDescription.value
        ) {
            errors.push(
                `ERROR: Missing lab description`
            );
        }

        if (
            input.memberGroup.value == "scientist"
            && !input.labName.value
        ) {
            errors.push(`ERROR: Missing name of lab`);
        }
    }

    function fillInClaims() {
        let faceClaim = 
`<div class="claim-row">
    <span class="detail-alitus"><b>${input.faceClaim.value}</b></span> as 
    <span class="detail-alitus no-bg text-color-${input.memberGroup.value}">
        <a href="${input.profileUrl.value}" title="played by ${input.writerAlias.value}">${input.characterName.value}</a>
    </span>
</div>`;

        let occupationClaim = 
`<div class="list-item level-3">
    <span class="list-taken-by text-color-${input.memberGroup.value}">
        <a href="${input.profileUrl.value}">${input.characterName.value}</a>
    </span> ${
        input.occupation.value === ""
        ? ""
        : 
    `<span class="list-aside">(${input.occupation.value})</span>`
    }
</div>`;

        // labs are in the occupation claim list, so the occupation claim code is inserted into the lab claim
        let labClaim = 
`<div class="list-item level-1">
    <span class="heading-dinorwic">${input.labName.value}</span>
</div>

<div class="textblock-aniak left list-item level-2">
    ${input.labDescription.value}
</div>

<div class="list-item level-2">
    <span class="heading-dollfus">Lead</span>
    <span class="pill-gusev">Limit 1</span>
</div>

${input.isLabLead ? occupationClaim : ""}

<div class="list-item level-2">
    <span class="heading-dollfus">Staff</span>
</div>

${input.isLabLead ? "" : occupationClaim}`;

        return {
            faceClaim: faceClaim
            , occupationClaim: occupationClaim
            , labClaim: labClaim
        }
    }

    function compileClaimPost(claims) {
        let faceClaim = claims.faceClaim;
        let occupationClaim = claims.occupationClaim;
        let labClaim = claims.labClaim;

        let code = 
`${postBbcodeOpen}
Face claim: 
${codeBbcodeOpen} ${faceClaim} ${codeBbcodeClose}
    
Occupation claim: ${
    input.memberGroup.value == "scientist"
    ? 
`
Add to ${input.labName.value} as ${input.isLabLead ? "Lead" : "Staff"}`
    : ""
}
${codeBbcodeOpen} ${input.isNewLab ? labClaim : occupationClaim} ${codeBbcodeClose} ${
    input.requester.value || input.requestLocation.value
    ? `

${bold("REQUESTED CHARACTER")} ${
        input.requester.value
        ? `
Requested by: ${input.requester.value}`
        : ""
    } ${
        input.requestLocation.value
        ? `
Request location: ${
            input.requestLocation.value 
            && /^http/.test(input.requestLocation.value)
            ? url(input.requestLocation.value)
            : input.requestLocation.value
        }`
        : ""
    }`
    : ""
} 
${postBbcodeClose}`;

        return code;
    }

    function generateClaimCode() {
        reset();

        getInput();

        validateInput();

        // stop if input errors were found
        if (errors.length > 0) {
            errors.forEach(element => resultBox.textContent += element + newline);
            return;
        }

        console.log(input);
 
        let claims = fillInClaims();

        console.log(claims.faceClaim);
        console.log(claims.occupationClaim);
        console.log(claims.labClaim);

        let code = compileClaimPost(claims);

        // put code in the code box for use
        resultBox.textContent = code;
        return;
    }

    runBtn.addEventListener("click", generateClaimCode, false);
})();
