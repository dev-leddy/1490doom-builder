export function onRequest(context) {
  const url = new URL(context.request.url)
  
  if (url.pathname === '/quiz') {
    return Response.redirect(url.origin + '/quiz.html', 302)
  }
  
  return context.next()
}
