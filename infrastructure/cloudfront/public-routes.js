// Apply to the production publisher only during an explicitly authorized
// promotion. Dev uses its own distribution and remains noindex.
function handler(event) {
  var request = event.request;
  var host = request.headers.host && request.headers.host.value;
  var path = request.uri;
  var canonical = path === '/index.html' ? '/' : path === '/en/index.html' || path === '/en' ? '/en/' : path;
  if (host === 'www.info.zenloth.tech' || canonical !== path) {
    var query = [];
    Object.keys(request.querystring || {}).forEach(function (key) {
      var item = request.querystring[key];
      (item.multiValue || [item]).forEach(function (value) { query.push(key + '=' + value.value); });
    });
    return { statusCode: 301, statusDescription: 'Moved Permanently', headers: {
      location: { value: (host === 'www.info.zenloth.tech' ? 'https://info.zenloth.tech' : '') + canonical + (query.length ? '?' + query.join('&') : '') }
    }};
  }
  if (path.endsWith('/')) request.uri += 'index.html';
  return request;
}
