// 단순한 XSS 필터

function XSS() {}

XSS.filterContext = function(context) {
    return context.replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
module.exports = XSS;