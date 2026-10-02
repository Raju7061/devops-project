# Keep Minikube tunnel running on macOS

This macOS LaunchDaemon runs `minikube -p minikube tunnel` as root, starts it
when loaded, and restarts it if it exits. It is a host service, not a
Kubernetes Job; `minikube tunnel` needs host privileges to manage routes.
Install it once with the commands below. After that it starts automatically
at boot and you do not need to run `sudo minikube tunnel` manually.

The tunnel is separate from accessing the `todo.local:8080` ingress URL; use
the LaunchAgent below for that.

The plist assumes Minikube is installed at `/opt/homebrew/bin/minikube` and
uses the current user's Minikube profile and kubeconfig paths. Adjust those
paths in the plist if your installation differs.

Install and start it once (macOS will ask for your administrator password):

```sh
cd devops-project/minikube/launchd
sudo install -o root -g wheel -m 644 \
  ./com.enterprise-platform.minikube-tunnel.plist \
  /Library/LaunchDaemons/com.enterprise-platform.minikube-tunnel.plist
sudo launchctl enable system/com.enterprise-platform.minikube-tunnel
sudo launchctl bootstrap system \
  /Library/LaunchDaemons/com.enterprise-platform.minikube-tunnel.plist
```

Check its status and logs:

```sh
sudo launchctl print system/com.enterprise-platform.minikube-tunnel
tail -f /var/log/minikube-tunnel.log
```

To stop it for the current boot (it will start again at the next boot):

```sh
sudo launchctl bootout system/com.enterprise-platform.minikube-tunnel
```

If it was already bootstrapped and you change the plist, copy the updated
file to `/Library/LaunchDaemons/`, then restart the service:

```sh
sudo launchctl bootout system/com.enterprise-platform.minikube-tunnel
sudo install -o root -g wheel -m 644 \
  ./com.enterprise-platform.minikube-tunnel.plist \
  /Library/LaunchDaemons/com.enterprise-platform.minikube-tunnel.plist
sudo launchctl bootstrap system \
  /Library/LaunchDaemons/com.enterprise-platform.minikube-tunnel.plist
```

## Keep `todo.local:8080` accessible

The NGINX ingress controller is exposed as a NodePort in Minikube. This
LaunchAgent forwards local port 8080 to its HTTP port and restarts the
forward after Minikube or `kubectl port-forward` stops.

Install and start it from this directory:

```sh
launchctl bootstrap gui/$(id -u) \
  "$PWD/com.enterprise-platform.todo-ingress.plist"
```

Check its status:

```sh
launchctl print gui/$(id -u)/com.enterprise-platform.todo-ingress
```

To stop it:

```sh
launchctl bootout gui/$(id -u)/com.enterprise-platform.todo-ingress
```
