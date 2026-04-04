export async function onRequest(context) {
  const url = new URL(context.request.url)
  url.pathname = '/'
  url.searchParams.set('quiz', '')
  return Response.redirect(url.toString(), 302)
}
