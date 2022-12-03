package main

import (
	"fmt"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"log"
	"os"
	"strings"
	"text/template"
)

func main() {
	p := tea.NewProgram(initialModel())
	if _, err := p.Run(); err != nil {
		log.Fatal(err)
	}
}

type (
	errMsg error
)

type model struct {
	textInput textinput.Model
	err       error
}

func initialModel() model {
	ti := textinput.New()
	ti.Focus()
	ti.CharLimit = 156
	ti.Width = 20

	return model{
		textInput: ti,
		err:       nil,
	}
}

func (m model) Init() tea.Cmd {
	return textinput.Blink
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyEnter:
			if m.textInput.Value() == "" {
				return m, tea.Quit
			}

			createFiles(m.textInput.Value())
		case tea.KeyCtrlC, tea.KeyEsc:
			return m, tea.Quit
		}

	// We handle errors just like any other message
	case errMsg:
		m.err = msg
		return m, nil
	}

	m.textInput, cmd = m.textInput.Update(msg)
	return m, cmd
}

func createFiles(name string) {
	var tsxTemplate, _ = template.New("tsxTemplate").Parse(`import s from './{{.Name}}.module.scss';

export const {{.Name}} = () => {
	return (
		<div className={s.{{.ClassName}}}>
			<h1>{{.Name}}</h1>
		</div>
	);
};
`)

	var scssTemplate, _ = template.New("scssTemplate").Parse(`.{{.ClassName}} {
  color: red;
}	
`)

	className := strings.ToLower(name[0:1]) + name[1:]
	os.Mkdir("./"+name, os.ModePerm)

	tsxFile, _ := os.Create("./" + name + "/" + name + ".tsx")
	defer tsxFile.Close()
	scssFile, _ := os.Create("./" + name + "/" + name + ".module.scss")
	defer scssFile.Close()

	fileInput := FileInput{
		Name:      name,
		ClassName: className,
	}

	tsxTemplate.Execute(tsxFile, fileInput)
	scssTemplate.Execute(scssFile, fileInput)

}

func (m model) View() string {
	return fmt.Sprintf(
		"Name of the new component (in CamelCase)\n%s",
		m.textInput.View(),
	) + "\n"
}

type FileInput struct {
	Name      string
	ClassName string
}
